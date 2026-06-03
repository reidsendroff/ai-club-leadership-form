#!/usr/bin/env python3
"""
Rank AI Club leadership candidates from the applications database.

This script reads DATABASE_URL from the environment or a local .env file,
pulls applications from Postgres through the repo's existing Node pg
dependency, asks available AI CLIs for independent evaluations, and writes a
consensus report to data/rankings/.

The output is advisory. Reid and Ben make the final leadership decisions.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "data" / "rankings"
DEFAULT_MODELS = ("claude", "gemini", "codex")
ROLE_ORDER = [
    "VP / COO",
    "CMO / Social Media",
    "Treasurer / Resources",
    "Secretary / Systems",
    "TA / Administrative Assistant",
    "Project Lead",
]


def load_dotenv() -> None:
    for filename in (".env", ".env.local"):
        path = ROOT / filename
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            key = key.strip().lstrip("\ufeff")
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


def run(
    command: list[str],
    *,
    timeout: int,
    env: dict[str, str] | None = None,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    if os.name == "nt" and command:
        cmd_shim = shutil.which(f"{command[0]}.cmd")
        if cmd_shim:
            command = [cmd_shim, *command[1:]]
    return subprocess.run(
        command,
        cwd=ROOT,
        env=env,
        text=True,
        encoding="utf-8",
        errors="replace",
        input=input_text,
        capture_output=True,
        timeout=timeout,
        check=False,
    )


def fetch_applications(limit: int) -> list[dict]:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit(
            "DATABASE_URL is not set. Put it in a local .env file or run:\n"
            "  $env:DATABASE_URL='postgresql://...'\n"
            "The .env file is gitignored, so do not commit live Railway credentials."
        )

    node_code = r"""
import pg from 'pg';
const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('railway') || databaseUrl.includes('render') || databaseUrl.includes('neon')
    ? { rejectUnauthorized: false }
    : undefined,
});

const limit = Number(process.env.RANK_LIMIT || 100);
const { rows } = await pool.query(`
  select
    id, created_at, full_name, email, grade, contact, roles_interested,
    top_role, second_role, role_fit, project_title, project_description,
    project_link, code_link, tools_used, other_tools, solo_or_team,
    personal_contribution, blocker, next_improvement, demo_video_link,
    resume_link, github_profile, resume_filename, resume_size,
    grit_evidence, presentation_evidence, june15_availability,
    activities_next_year, monday_attendance, full_meeting_availability,
    attendance_conflicts, demo_acknowledgements, leadership_expectations,
    weekly_responsibility, summer_availability, final_confirmations, extra_notes
  from applications
  order by created_at desc
  limit $1
`, [limit]);

console.log(JSON.stringify(rows));
await pool.end();
"""
    env = os.environ.copy()
    env["RANK_LIMIT"] = str(limit)
    result = run(["node", "--input-type=module", "-e", node_code], timeout=45, env=env)
    if result.returncode != 0:
        raise SystemExit(f"Database query failed:\n{result.stderr or result.stdout}")
    return json.loads(result.stdout or "[]")


def candidate_profiles(rows: list[dict]) -> str:
    chunks = []
    for row in rows:
        chunks.append(
            textwrap.dedent(
                f"""
                Candidate ID: {row.get('id')}
                Name: {row.get('full_name')} | Grade: {row.get('grade')} | Email: {row.get('email')}
                Roles interested: {', '.join(row.get('roles_interested') or [])}
                Top role: {row.get('top_role')} | Second role: {row.get('second_role') or 'none'}
                Project: {row.get('project_title')}
                Project link: {row.get('project_link') or 'none'}
                Code link: {row.get('code_link') or 'none'}
                GitHub profile: {row.get('github_profile') or 'none'}
                Tools: {', '.join(row.get('tools_used') or [])}{(' | Other: ' + row.get('other_tools')) if row.get('other_tools') else ''}
                Project description: {row.get('project_description') or ''}
                Personal contribution: {row.get('personal_contribution') or ''}
                Blocker / fix: {row.get('blocker') or ''}
                Next improvement: {row.get('next_improvement') or ''}
                Role fit: {row.get('role_fit') or ''}
                Grit evidence: {row.get('grit_evidence') or ''}
                Presentation evidence: {row.get('presentation_evidence') or ''}
                June 15 availability: {row.get('june15_availability') or ''}
                Monday attendance: {row.get('monday_attendance') or ''}
                Full meeting availability: {row.get('full_meeting_availability') or ''}
                Activities next year: {row.get('activities_next_year') or ''}
                Known conflicts: {row.get('attendance_conflicts') or ''}
                Weekly responsibility: {row.get('weekly_responsibility') or ''}
                Summer availability: {row.get('summer_availability') or ''}
                Extra notes: {row.get('extra_notes') or ''}
                """
            ).strip()
        )
    return "\n\n---\n\n".join(chunks)


def build_prompt(rows: list[dict]) -> str:
    return f"""
You are evaluating AI Club leadership candidates. Act like a strict but fair startup operating partner and technical club advisor.

Context:
- The club is being run like a small technical company.
- Leadership is a working role, not a resume title.
- The strongest signals are grit, AI/build skill, coding or vibe-coding fluency, GitHub/project evidence, presentation skill, reliability, role fit, and realistic availability.
- Important tools/skills include GitHub, Claude Code, Codex, Cursor/Windsurf, ChatGPT/Gemini, debugging, deployment basics, automation, project documentation, and explaining work clearly.
- Do not over-index on polished writing. Reward evidence of actually building, finishing, debugging, and communicating.
- Penalize vague answers, no project evidence, weak availability, unclear personal contribution, or wanting a title without owning weekly work.
- This is advisory only. Reid and Ben make the final decision.

Open roles:
{", ".join(ROLE_ORDER)}

Return JSON only, with this exact shape:
{{
  "model": "your model or CLI name",
  "rankedCandidates": [
    {{
      "id": 1,
      "fullName": "Name",
      "totalScore": 0,
      "scores": {{
        "buildSkill": 0,
        "grit": 0,
        "presentation": 0,
        "reliability": 0,
        "roleFit": 0,
        "technicalLeadership": 0
      }},
      "recommendedRoles": ["role 1", "role 2"],
      "strengths": ["specific strength"],
      "risks": ["specific risk"],
      "interviewQuestions": ["question to ask before deciding"]
    }}
  ],
  "recommendedLeadershipTeam": {{
    "VP / COO": {{"id": null, "fullName": null, "reason": "short reason"}},
    "CMO / Social Media": {{"id": null, "fullName": null, "reason": "short reason"}},
    "Treasurer / Resources": {{"id": null, "fullName": null, "reason": "short reason"}},
    "Secretary / Systems": {{"id": null, "fullName": null, "reason": "short reason"}},
    "TA / Administrative Assistant": {{"id": null, "fullName": null, "reason": "short reason"}},
    "Project Lead": {{"id": null, "fullName": null, "reason": "short reason"}}
  }},
  "overallConcerns": ["concern"],
  "decisionNotesForReidAndBen": ["note"]
}}

Score each category from 0 to 10. Make totalScore the average of the six categories.

Applications:
{candidate_profiles(rows)}
""".strip()


def cli_command(model: str) -> tuple[list[str], dict[str, str]]:
    env = os.environ.copy()
    if model == "claude":
        return ["claude", "-p"], env
    if model == "gemini":
        env["GEMINI_CLI_TRUST_WORKSPACE"] = "true"
        return ["gemini", "--skip-trust", "-p", "Evaluate the candidate data from stdin. Return JSON only."], env
    if model == "codex":
        return [
            "codex",
            "exec",
            "--cd",
            str(ROOT),
            "--sandbox",
            "read-only",
            "--ephemeral",
            "-",
        ], env
    raise ValueError(f"Unknown model: {model}")


def extract_json(text: str) -> dict | None:
    text = text.strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def evaluate_with_models(rows: list[dict], models: list[str], timeout: int) -> list[dict]:
    prompt = build_prompt(rows)
    evaluations = []
    for model in models:
        if not shutil.which(model) and not shutil.which(f"{model}.cmd"):
            evaluations.append({"model": model, "ok": False, "error": f"{model} CLI not found on PATH"})
            continue
        command, env = cli_command(model)
        print(f"Asking {model} to evaluate {len(rows)} candidates...", flush=True)
        try:
            result = run(command, timeout=timeout, env=env, input_text=prompt)
        except subprocess.TimeoutExpired:
            evaluations.append({"model": model, "ok": False, "error": f"Timed out after {timeout}s"})
            continue
        parsed = extract_json(result.stdout)
        evaluations.append(
            {
                "model": model,
                "ok": result.returncode == 0 and parsed is not None,
                "returncode": result.returncode,
                "parsed": parsed,
                "stdout": result.stdout[-12000:],
                "stderr": result.stderr[-4000:],
            }
        )
    return evaluations


def build_consensus(rows: list[dict], evaluations: list[dict]) -> dict:
    names = {int(row["id"]): row.get("full_name") for row in rows}
    per_candidate: dict[int, list[dict]] = {}
    role_votes: dict[str, list[dict]] = {role: [] for role in ROLE_ORDER}

    for evaluation in evaluations:
        parsed = evaluation.get("parsed") if evaluation.get("ok") else None
        if not parsed:
            continue
        model = evaluation["model"]
        for candidate in parsed.get("rankedCandidates", []):
            try:
                candidate_id = int(candidate["id"])
            except (KeyError, TypeError, ValueError):
                continue
            per_candidate.setdefault(candidate_id, []).append(
                {
                    "model": model,
                    "totalScore": float(candidate.get("totalScore") or 0),
                    "recommendedRoles": candidate.get("recommendedRoles") or [],
                    "strengths": candidate.get("strengths") or [],
                    "risks": candidate.get("risks") or [],
                    "interviewQuestions": candidate.get("interviewQuestions") or [],
                }
            )
        team = parsed.get("recommendedLeadershipTeam") or {}
        for role in ROLE_ORDER:
            pick = team.get(role)
            if isinstance(pick, dict) and pick.get("id"):
                role_votes[role].append({"model": model, **pick})

    ranked = []
    for candidate_id, items in per_candidate.items():
        ranked.append(
            {
                "id": candidate_id,
                "fullName": names.get(candidate_id, "Unknown"),
                "averageScore": round(mean(item["totalScore"] for item in items), 2),
                "modelCount": len(items),
                "recommendedRoles": sorted({role for item in items for role in item["recommendedRoles"]}),
                "strengths": [entry for item in items for entry in item["strengths"][:2]],
                "risks": [entry for item in items for entry in item["risks"][:2]],
                "interviewQuestions": [entry for item in items for entry in item["interviewQuestions"][:2]],
            }
        )
    ranked.sort(key=lambda item: item["averageScore"], reverse=True)

    consensus_team = {}
    for role, votes in role_votes.items():
        vote_counts: dict[int, list[dict]] = {}
        for vote in votes:
            try:
                vote_counts.setdefault(int(vote["id"]), []).append(vote)
            except (KeyError, TypeError, ValueError):
                continue
        if not vote_counts:
            consensus_team[role] = {"id": None, "fullName": None, "votes": 0, "reason": "No model consensus."}
            continue
        winner_id, winner_votes = max(vote_counts.items(), key=lambda pair: len(pair[1]))
        consensus_team[role] = {
            "id": winner_id,
            "fullName": names.get(winner_id, "Unknown"),
            "votes": len(winner_votes),
            "reason": " | ".join(str(vote.get("reason") or "").strip() for vote in winner_votes if vote.get("reason"))[:600],
        }

    return {
        "rankedCandidates": ranked,
        "recommendedLeadershipTeam": consensus_team,
        "modelsUsed": [item["model"] for item in evaluations if item.get("ok")],
        "modelFailures": [
            {"model": item["model"], "error": item.get("error") or item.get("stderr") or "No parseable JSON"}
            for item in evaluations
            if not item.get("ok")
        ],
    }


def write_reports(rows: list[dict], evaluations: list[dict], consensus: dict) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = OUTPUT_DIR / f"leadership_ranking_{stamp}.json"
    md_path = OUTPUT_DIR / f"leadership_ranking_{stamp}.md"

    payload = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "candidateCount": len(rows),
        "consensus": consensus,
        "modelEvaluations": evaluations,
    }
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# AI Club Leadership Candidate Ranking",
        "",
        f"Generated: {payload['generatedAt']}",
        f"Candidates reviewed: {len(rows)}",
        "",
        "> Advisory only. Reid and Ben make the final decision.",
        "",
        "## Consensus Ranking",
        "",
    ]
    for index, candidate in enumerate(consensus["rankedCandidates"], start=1):
        lines.extend(
            [
                f"{index}. **{candidate['fullName']}** (ID {candidate['id']}) - {candidate['averageScore']}/10",
                f"   Roles: {', '.join(candidate['recommendedRoles']) or 'none'}",
                f"   Risks to check: {'; '.join(candidate['risks'][:3]) or 'none flagged'}",
                "",
            ]
        )

    lines.extend(["## Recommended Leadership Team", ""])
    for role, pick in consensus["recommendedLeadershipTeam"].items():
        if pick["id"]:
            lines.append(f"- **{role}:** {pick['fullName']} (ID {pick['id']}, {pick['votes']} model vote(s))")
        else:
            lines.append(f"- **{role}:** No consensus")

    if consensus["modelFailures"]:
        lines.extend(["", "## Model Failures", ""])
        for failure in consensus["modelFailures"]:
            lines.append(f"- **{failure['model']}:** {failure['error']}")

    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return json_path, md_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Rank AI Club leadership candidates using Postgres + model CLI consensus.")
    parser.add_argument("--limit", type=int, default=100, help="Maximum applications to read from the database.")
    parser.add_argument("--models", default=",".join(DEFAULT_MODELS), help="Comma-separated model CLIs: claude,gemini,codex.")
    parser.add_argument("--timeout", type=int, default=180, help="Seconds to wait for each model CLI.")
    parser.add_argument("--fetch-only", action="store_true", help="Only query the database and write raw candidate JSON.")
    args = parser.parse_args()

    load_dotenv()
    rows = fetch_applications(args.limit)
    if not rows:
        raise SystemExit("No applications found in the database.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = OUTPUT_DIR / "latest_applications_snapshot.json"
    raw_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Fetched {len(rows)} applications. Snapshot: {raw_path}")

    if args.fetch_only:
        return 0

    models = [item.strip() for item in args.models.split(",") if item.strip()]
    evaluations = evaluate_with_models(rows, models, args.timeout)
    consensus = build_consensus(rows, evaluations)
    json_path, md_path = write_reports(rows, evaluations, consensus)
    print(f"JSON report: {json_path}")
    print(f"Markdown report: {md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

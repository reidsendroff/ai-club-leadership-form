import pg from 'pg';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const useLocalJson = !databaseUrl;
const dataDir = path.resolve('data');
const localStore = path.join(dataDir, 'applications.json');

if (!databaseUrl) {
  console.warn('DATABASE_URL is not set. Using local JSON storage for development.');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('railway') || databaseUrl?.includes('render') || databaseUrl?.includes('neon')
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function ensureSchema() {
  if (useLocalJson) {
    await mkdir(dataDir, { recursive: true });
    if (!existsSync(localStore)) {
      await writeFile(localStore, '[]\n', 'utf8');
    }
    return;
  }

  await pool.query(`
    create table if not exists applications (
      id bigserial primary key,
      created_at timestamptz not null default now(),
      full_name text not null,
      email text not null,
      grade text not null,
      contact text,
      roles_interested text[] not null,
      top_role text not null,
      second_role text,
      role_fit text not null,
      project_title text not null,
      project_description text not null,
      project_link text not null,
      code_link text,
      tools_used text[] not null,
      solo_or_team text not null,
      personal_contribution text,
      blocker text not null,
      next_improvement text not null,
      demo_video_link text,
      resume_link text,
      resume_filename text,
      resume_mimetype text,
      resume_size integer,
      resume_data bytea,
      grit_evidence text not null,
      presentation_evidence text not null,
      june15_availability text not null,
      demo_acknowledgements text[] not null,
      leadership_expectations text[] not null,
      weekly_responsibility text not null,
      summer_availability text not null,
      final_confirmations text[] not null,
      extra_notes text,
      raw_payload jsonb not null
    );
  `);

  await pool.query(`
    create index if not exists applications_created_at_idx on applications(created_at desc);
  `);
}

export async function insertApplication(data, resumeFile) {
  if (useLocalJson) {
    const rows = await readLocalRows();
    const record = {
      id: rows.length ? Math.max(...rows.map((row) => Number(row.id) || 0)) + 1 : 1,
      created_at: new Date().toISOString(),
      full_name: data.fullName,
      email: data.email,
      grade: data.grade,
      contact: data.contact || null,
      roles_interested: data.rolesInterested,
      top_role: data.topRole,
      second_role: data.secondRole || null,
      role_fit: data.roleFit,
      project_title: data.projectTitle,
      project_description: data.projectDescription,
      project_link: data.projectLink,
      code_link: data.codeLink || null,
      tools_used: data.toolsUsed,
      solo_or_team: data.soloOrTeam,
      personal_contribution: data.personalContribution || null,
      blocker: data.blocker,
      next_improvement: data.nextImprovement,
      demo_video_link: data.demoVideoLink || null,
      resume_link: data.resumeLink || null,
      resume_filename: resumeFile?.originalname || null,
      resume_mimetype: resumeFile?.mimetype || null,
      resume_size: resumeFile?.size || null,
      resume_data_base64: resumeFile?.buffer?.toString('base64') || null,
      grit_evidence: data.gritEvidence,
      presentation_evidence: data.presentationEvidence,
      june15_availability: data.june15Availability,
      demo_acknowledgements: data.demoAcknowledgements,
      leadership_expectations: data.leadershipExpectations,
      weekly_responsibility: data.weeklyResponsibility,
      summer_availability: data.summerAvailability,
      final_confirmations: data.finalConfirmations,
      extra_notes: data.extraNotes || null,
      raw_payload: data,
    };
    rows.push(record);
    await writeFile(localStore, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    return { id: record.id, created_at: record.created_at };
  }

  const values = [
    data.fullName,
    data.email,
    data.grade,
    data.contact || null,
    data.rolesInterested,
    data.topRole,
    data.secondRole || null,
    data.roleFit,
    data.projectTitle,
    data.projectDescription,
    data.projectLink,
    data.codeLink || null,
    data.toolsUsed,
    data.soloOrTeam,
    data.personalContribution || null,
    data.blocker,
    data.nextImprovement,
    data.demoVideoLink || null,
    data.resumeLink || null,
    resumeFile?.originalname || null,
    resumeFile?.mimetype || null,
    resumeFile?.size || null,
    resumeFile?.buffer || null,
    data.gritEvidence,
    data.presentationEvidence,
    data.june15Availability,
    data.demoAcknowledgements,
    data.leadershipExpectations,
    data.weeklyResponsibility,
    data.summerAvailability,
    data.finalConfirmations,
    data.extraNotes || null,
    data,
  ];

  const result = await pool.query(`
    insert into applications (
      full_name, email, grade, contact, roles_interested, top_role, second_role,
      role_fit, project_title, project_description, project_link, code_link,
      tools_used, solo_or_team, personal_contribution, blocker, next_improvement,
      demo_video_link, resume_link, resume_filename, resume_mimetype, resume_size,
      resume_data, grit_evidence, presentation_evidence, june15_availability,
      demo_acknowledgements, leadership_expectations, weekly_responsibility,
      summer_availability, final_confirmations, extra_notes, raw_payload
    )
    values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
      $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
    )
    returning id, created_at
  `, values);

  return result.rows[0];
}

export async function listApplications() {
  if (useLocalJson) {
    const rows = await readLocalRows();
    return rows
      .map(({ resume_data_base64: _resumeDataBase64, raw_payload: _rawPayload, ...row }) => row)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const result = await pool.query(`
    select
      id, created_at, full_name, email, grade, contact, roles_interested,
      top_role, second_role, role_fit, project_title, project_description,
      project_link, code_link, tools_used, solo_or_team, personal_contribution,
      blocker, next_improvement, demo_video_link, resume_link, resume_filename,
      resume_mimetype, resume_size, grit_evidence, presentation_evidence,
      june15_availability, demo_acknowledgements, leadership_expectations,
      weekly_responsibility, summer_availability, final_confirmations, extra_notes
    from applications
    order by created_at desc
  `);
  return result.rows;
}

export async function getResume(id) {
  if (useLocalJson) {
    const rows = await readLocalRows();
    const row = rows.find((item) => String(item.id) === String(id));
    if (!row?.resume_data_base64) return null;
    return {
      resume_filename: row.resume_filename,
      resume_mimetype: row.resume_mimetype,
      resume_data: Buffer.from(row.resume_data_base64, 'base64'),
    };
  }

  const result = await pool.query(`
    select resume_filename, resume_mimetype, resume_data
    from applications
    where id = $1
  `, [id]);
  return result.rows[0];
}

export async function closePool() {
  if (useLocalJson) return;
  await pool.end();
}

async function readLocalRows() {
  await ensureSchema();
  const text = await readFile(localStore, 'utf8');
  return JSON.parse(text || '[]');
}

# Super Prompt: Submission Reliability Fix

You are a top 0.1% production software engineer with 20+ years of experience building high-stakes student-facing web forms where submission reliability matters more than over-policing copy quality.

Mission:
Fix the AI Club leadership form so students can submit applications reliably. The form must never silently fail or strand a student on the final page without telling them what happened.

User context:
If students cannot submit, Reid does not receive leadership applications. The form should collect useful signal, but it must not reject students because a text box is shorter than a sentence or because optional acknowledgement guardrails are incomplete.

Engineering requirements:

- Remove sentence-length validation from text boxes.
- Do not require essay-style answers to submit.
- Do not hard-block submission because every acknowledgement, expectation, or final confirmation checkbox is not checked.
- Keep baseline checks only:
  - required identity fields
  - required role selection
  - required project title and project link
  - required tools used
  - required availability/select fields
  - if a GitHub repo link is provided, it must look like `https://github.com/username/project`
  - if a GitHub profile link is provided, it must look like `https://github.com/username`
- Keep server-side validation aligned with browser-side validation.
- Show visible, human-readable errors on submission failures.
- Do not silently navigate away from the final page without a useful message.
- Preserve the existing app architecture, styling, storage flow, and admin/export behavior.

Execution plan:

1. Inspect the frontend submit flow and server validation schema.
2. Replace strict long-text validation with permissive trimmed text validation.
3. Convert final checkbox groups from hard blockers into collected signals.
4. Add explicit GitHub URL shape checks for repo/profile fields.
5. Improve client-side submit error notification so failures are visible and understandable.
6. Run syntax checks and validation smoke tests.

Definition of done:

- A sparse but legitimate application can submit.
- Missing true baseline fields still block with a clear error.
- Bad GitHub repo/profile shapes still block with a clear error.
- The app passes local syntax checks.

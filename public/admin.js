const tokenInput = document.querySelector('#token');
const loadButton = document.querySelector('#load');
const statusEl = document.querySelector('#status');
const list = document.querySelector('#list');
const csvLink = document.querySelector('#csvLink');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

loadButton.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    statusEl.textContent = 'Enter the admin token.';
    return;
  }
  csvLink.href = `/api/export.csv?token=${encodeURIComponent(token)}`;
  statusEl.textContent = 'Loading...';
  list.innerHTML = '';

  const response = await fetch(`/api/applications?token=${encodeURIComponent(token)}`);
  const payload = await response.json();
  if (!response.ok) {
    statusEl.textContent = payload.error || 'Failed to load.';
    return;
  }

  statusEl.textContent = `${payload.applications.length} applications.`;
  for (const app of payload.applications) {
    const card = document.createElement('article');
    card.className = 'admin-card';
    const resume = app.resume_filename
      ? `<a href="/api/applications/${app.id}/resume?token=${encodeURIComponent(token)}">Download resume</a>`
      : 'No resume uploaded';
    const tools = (app.tools_used || []).join(', ');
    const otherTools = app.other_tools ? ` (${app.other_tools})` : '';
    card.innerHTML = `
      <h3>${escapeHtml(app.full_name)} &middot; ${escapeHtml(app.top_role)}</h3>
      <p><strong>Email:</strong> ${escapeHtml(app.email)} &middot; <strong>Grade:</strong> ${escapeHtml(app.grade)}</p>
      <p><strong>Interested:</strong> ${escapeHtml((app.roles_interested || []).join(', '))}</p>
      <p><strong>Project:</strong> <a href="${escapeHtml(app.project_link)}">${escapeHtml(app.project_title)}</a></p>
      <p><strong>Tools:</strong> ${escapeHtml(tools)}${escapeHtml(otherTools)}</p>
      <p><strong>Activities next year:</strong> ${escapeHtml(app.activities_next_year)}</p>
      <p><strong>Monday attendance:</strong> ${escapeHtml(app.monday_attendance)}</p>
      <p><strong>Full meeting:</strong> ${escapeHtml(app.full_meeting_availability)}</p>
      <p><strong>Known conflicts:</strong> ${escapeHtml(app.attendance_conflicts || 'None listed')}</p>
      <p><strong>Blocker:</strong> ${escapeHtml(app.blocker)}</p>
      <p><strong>Presentation:</strong> ${escapeHtml(app.presentation_evidence)}</p>
      <p>${resume}</p>
    `;
    list.append(card);
  }
});

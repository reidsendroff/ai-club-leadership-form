const roles = [
  {
    value: 'VP / COO',
    label: 'VP / Chief Operations Officer',
    description: 'Meeting ops, project-team check-ins, scrums, blockers, follow-through',
  },
  {
    value: 'CMO / Social Media',
    label: 'CMO / Social Media',
    description: 'Announcements, Instagram/TikTok, clips, project showcases',
  },
  {
    value: 'Treasurer / Resources',
    label: 'Treasurer / Resources',
    description: 'API budget, parent donations, reimbursements, tool access',
  },
  {
    value: 'Secretary / Systems',
    label: 'Secretary / Systems',
    description: 'Attendance, notes, Canvas records, deadlines, AI Club Brain',
  },
  {
    value: 'TA / Administrative Assistant',
    label: 'TA / Administrative Assistant',
    description: 'Meeting help, member support, presentations',
  },
  {
    value: 'Project Lead',
    label: 'Project Lead',
    description: 'Owns a build team, keeps the team moving, makes demos real',
  },
];

const tools = [
  'Claude Code',
  'Codex',
  'Cursor',
  'Windsurf',
  'ChatGPT',
  'Gemini',
  'Replit',
  'GitHub Copilot',
  'Python',
  'JavaScript / TypeScript',
  'HTML / CSS',
  'No-code or low-code tool',
  'Other',
];

const demoAcknowledgements = [
  'Up to 5 minutes total: 4-minute demo + 1-minute Q&A',
  'If many people apply, the format may switch to shorter lightning demos',
  'I should show the real project, not just talk about it',
];

const leadershipExpectations = [
  'I can attend at least 75% of AI Club meetings next year',
  'I can own weekly responsibilities without Reid or Ben chasing me',
  'I can respond to leadership messages within a reasonable time',
  'I understand leadership is not honorary',
  'I understand I may be moved out of leadership if I consistently do not perform',
];

const finalConfirmations = [
  'I represented my project honestly',
  'I disclosed team help or outside help where relevant',
  'I give AI Club permission to discuss or showcase my project internally',
  'I understand Reid and Ben will use this form plus the June 15 demo to make leadership decisions',
];

const form = document.querySelector('#applicationForm');
const statusEl = document.querySelector('#formStatus');

function renderRoleCards() {
  const roleCards = document.querySelector('#roleCards');
  const topRole = form.elements.topRole;
  const secondRole = form.elements.secondRole;

  topRole.innerHTML = '<option value="">Select top choice</option>';
  secondRole.innerHTML = '<option value="">Select second choice</option><option>No second choice</option>';

  roles.forEach((role) => {
    const card = document.createElement('label');
    card.className = 'role-card';
    card.innerHTML = `
      <input type="checkbox" name="rolesInterested" value="${role.value}">
      <span><strong>${role.label}</strong>${role.description}</span>
    `;
    roleCards.append(card);

    topRole.add(new Option(role.label, role.value));
    secondRole.add(new Option(role.label, role.value));
  });
}

function renderChecks(containerId, name, values) {
  const container = document.querySelector(containerId);
  values.forEach((value) => {
    const label = document.createElement('label');
    label.className = 'check';
    label.innerHTML = `
      <input type="checkbox" name="${name}" value="${value}">
      <span><strong>${value}</strong></span>
    `;
    container.append(label);
  });
}

function selectedValues(name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function updateRoleCount() {
  document.querySelector('#roleCount').textContent = selectedValues('rolesInterested').length;
}

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = type;
}

function requireAllChecked(name, expectedCount, label) {
  const count = selectedValues(name).length;
  if (count !== expectedCount) {
    throw new Error(`Please check all ${expectedCount} ${label}.`);
  }
}

renderRoleCards();
renderChecks('#toolChecks', 'toolsUsed', tools);
renderChecks('#demoAcks', 'demoAcknowledgements', demoAcknowledgements);
renderChecks('#expectations', 'leadershipExpectations', leadershipExpectations);
renderChecks('#confirmations', 'finalConfirmations', finalConfirmations);

form.addEventListener('change', updateRoleCount);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');

  try {
    if (!form.reportValidity()) return;
    if (!selectedValues('rolesInterested').length) throw new Error('Select at least one role.');
    if (!selectedValues('toolsUsed').length) throw new Error('Select at least one tool used.');
    requireAllChecked('demoAcknowledgements', demoAcknowledgements.length, 'demo acknowledgements');
    requireAllChecked('leadershipExpectations', leadershipExpectations.length, 'leadership expectations');
    requireAllChecked('finalConfirmations', finalConfirmations.length, 'final confirmations');

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setStatus('Submitting...');

    const fd = new FormData(form);
    for (const name of ['rolesInterested', 'toolsUsed', 'demoAcknowledgements', 'leadershipExpectations', 'finalConfirmations']) {
      fd.delete(name);
      fd.set(name, JSON.stringify(selectedValues(name)));
    }

    const response = await fetch('/api/applications', {
      method: 'POST',
      body: fd,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload.issues?.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
      throw new Error(detail || payload.error || 'Submission failed.');
    }

    form.reset();
    updateRoleCount();
    setStatus(`Submitted. Application ID: ${payload.id}. Keep building before June 15.`, 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;
  }
});


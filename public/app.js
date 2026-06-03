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
  'I understand the June 15 format: up to 5 minutes total, usually a 4-minute demo and 1-minute Q&A. If many people apply, demos may become shorter lightning demos. I should show the real project or prototype, not only describe the idea.',
];

const leadershipExpectations = [
  'I can attend most Monday AI Club meetings next year and stay for the full meeting when possible',
  'I can own a weekly responsibility without Reid or Ben repeatedly reminding me',
  'I can respond to leadership messages and blockers in a reasonable amount of time',
  'I understand leadership is a working role, not just a title for a resume',
  'I am willing to use AI tools, GitHub, documentation, and automation to help the club run better',
  'I can ask for help early if I am falling behind instead of disappearing',
  'I understand role assignments may change if my availability or follow-through does not match the responsibility',
];

const finalConfirmations = [
  'The project links and descriptions I submitted are accurate',
  'If I worked with teammates or used outside help, I explained my own contribution clearly',
  'AI Club may review or discuss my submitted project internally as part of leadership selection',
  'I understand Reid and Ben will use this application, my project evidence, and the June 15 demo or presentation to make leadership decisions',
];

const form = document.querySelector('#applicationForm');
const statusEl = document.querySelector('#formStatus');
const draftStatusEl = document.querySelector('#draftStatus');
const prevButton = document.querySelector('#prevStep');
const nextButton = document.querySelector('#nextStep');
const submitButton = document.querySelector('#submitApplication');
const panels = Array.from(form.querySelectorAll('.panel'));
const stepIds = panels.map((panel) => panel.id);
const draftKey = 'aiClubLeadershipApplicationDraft:v3';
let currentStep = Math.max(0, stepIds.indexOf(window.location.hash.replace('#', '')));
let saveTimer;

function scrollToSection(id, behavior = 'smooth') {
  const target = document.querySelector(id);
  if (!target) return;
  target.scrollIntoView({ behavior, block: 'start' });
}

function showStep(index, behavior = 'smooth') {
  currentStep = Math.min(Math.max(index, 0), panels.length - 1);
  panels.forEach((panel, panelIndex) => {
    panel.hidden = panelIndex !== currentStep;
  });

  document.querySelectorAll('[data-step-link]').forEach((link) => {
    const isActive = link.dataset.stepLink === stepIds[currentStep];
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'step' : 'false');
  });

  prevButton.disabled = currentStep === 0;
  nextButton.hidden = currentStep === panels.length - 1;
  submitButton.hidden = currentStep !== panels.length - 1;

  const hash = `#${stepIds[currentStep]}`;
  if (window.location.hash !== hash) {
    window.history.replaceState(null, '', hash);
  }
  scrollToSection(hash, behavior);
}

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

function updateOtherToolsField() {
  const otherSelected = selectedValues('toolsUsed').includes('Other');
  const field = document.querySelector('#otherToolsField');
  const input = form.elements.otherTools;
  field.hidden = !otherSelected;
  input.required = otherSelected;
  if (!otherSelected) input.value = '';
}

function setDraftStatus(message) {
  draftStatusEl.textContent = message;
}

function setStatus(message, type = '') {
  statusEl.className = type;
  statusEl.replaceChildren();
  if (Array.isArray(message)) {
    const list = document.createElement('ul');
    message.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    });
    statusEl.append(list);
    return;
  }
  statusEl.textContent = message;
}

function requireAllChecked(name, expectedCount, message, sectionId) {
  const count = selectedValues(name).length;
  if (count !== expectedCount) {
    if (sectionId) scrollToSection(sectionId);
    throw new Error(message);
  }
}

function serializeDraft() {
  const draft = {};
  Array.from(form.elements).forEach((element) => {
    if (!element.name || element.type === 'file') return;
    if (element.type === 'checkbox') {
      draft[element.name] ??= [];
      if (element.checked) draft[element.name].push(element.value);
      return;
    }
    draft[element.name] = element.value;
  });
  return draft;
}

function saveDraft() {
  window.localStorage.setItem(draftKey, JSON.stringify(serializeDraft()));
  setDraftStatus('Draft saved locally in this browser.');
}

function queueDraftSave() {
  setDraftStatus('Saving draft...');
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveDraft, 250);
}

function restoreDraft() {
  const raw = window.localStorage.getItem(draftKey);
  if (!raw) return;

  try {
    const draft = JSON.parse(raw);
    Object.entries(draft).forEach(([name, value]) => {
      const field = form.elements[name];
      if (!field) return;
      const normalized = typeof field.length === 'number' && !field.type ? Array.from(field) : [field];
      normalized.filter(Boolean).forEach((element) => {
        if (element.type === 'checkbox') {
          element.checked = Array.isArray(value) && value.includes(element.value);
          return;
        }
        if (element.type !== 'file') element.value = value ?? '';
      });
    });
    setDraftStatus('Draft restored from this browser.');
  } catch {
    setDraftStatus('Draft autosave is available.');
  }
}

function validatePanel(panel) {
  const controls = Array.from(panel.querySelectorAll('input, select, textarea'));
  const invalid = controls.find((control) => !control.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return false;
  }

  if (panel.id === 'positions' && !selectedValues('rolesInterested').length) {
    setStatus('Select at least one role.', 'error');
    return false;
  }
  if (panel.id === 'project' && !selectedValues('toolsUsed').length) {
    setStatus('Select at least one tool used.', 'error');
    return false;
  }
  if (panel.id === 'project' && selectedValues('toolsUsed').includes('Other') && !form.elements.otherTools.value.trim()) {
    setStatus('Tell us what the other tool is.', 'error');
    return false;
  }
  return true;
}

function findFirstInvalidStep() {
  for (let index = 0; index < panels.length; index += 1) {
    if (!validatePanel(panels[index])) return index;
  }
  if (selectedValues('demoAcknowledgements').length !== demoAcknowledgements.length) {
    setStatus('Confirm the June 15 demo format before submitting.', 'error');
    return stepIds.indexOf('commitment');
  }
  if (selectedValues('leadershipExpectations').length !== leadershipExpectations.length) {
    setStatus('Check every leadership expectation only if you can honestly agree to it.', 'error');
    return stepIds.indexOf('commitment');
  }
  if (selectedValues('finalConfirmations').length !== finalConfirmations.length) {
    setStatus('Complete the final confirmation checkboxes before submitting.', 'error');
    return stepIds.indexOf('confirm');
  }
  return -1;
}

renderRoleCards();
renderChecks('#toolChecks', 'toolsUsed', tools);
renderChecks('#demoAcks', 'demoAcknowledgements', demoAcknowledgements);
renderChecks('#expectations', 'leadershipExpectations', leadershipExpectations);
renderChecks('#confirmations', 'finalConfirmations', finalConfirmations);
restoreDraft();
updateRoleCount();
updateOtherToolsField();
showStep(currentStep, 'auto');

form.addEventListener('change', () => {
  updateRoleCount();
  updateOtherToolsField();
  queueDraftSave();
});

form.addEventListener('input', queueDraftSave);

document.querySelectorAll('.jump-nav a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const stepIndex = stepIds.indexOf(link.dataset.stepLink);
    if (stepIndex >= 0) showStep(stepIndex);
  });
});

prevButton.addEventListener('click', () => {
  setStatus('');
  showStep(currentStep - 1);
});

nextButton.addEventListener('click', () => {
  setStatus('');
  if (!validatePanel(panels[currentStep])) return;
  saveDraft();
  showStep(currentStep + 1);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');

  try {
    const invalidStep = findFirstInvalidStep();
    if (invalidStep >= 0) {
      showStep(invalidStep);
      return;
    }
    requireAllChecked('demoAcknowledgements', demoAcknowledgements.length, 'Confirm the June 15 demo format before submitting.', '#commitment');
    requireAllChecked(
      'leadershipExpectations',
      leadershipExpectations.length,
      'Check every leadership expectation only if you can honestly agree to it.',
      '#commitment',
    );
    requireAllChecked('finalConfirmations', finalConfirmations.length, 'Complete the final confirmation checkboxes before submitting.', '#confirm');

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
      if (payload.issues?.length) {
        setStatus(payload.issues.map((issue) => `${issue.path}: ${issue.message}`), 'error');
        return;
      }
      throw new Error(payload.error || 'Submission failed.');
    }

    form.reset();
    window.localStorage.removeItem(draftKey);
    updateRoleCount();
    updateOtherToolsField();
    showStep(0);
    setStatus(`Submitted. Application ID: ${payload.id}. Keep building before June 15.`, 'ok');
    setDraftStatus('Draft cleared after submission.');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submitButton.disabled = false;
  }
});

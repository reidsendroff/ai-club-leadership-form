/**
 * Native Google Forms fallback for the AI Club leadership application.
 *
 * Paste into script.google.com and run createAIClubLeadershipApplication().
 * The generated form links responses to a Google Sheet.
 */

const CONFIG = {
  formTitle: 'AI Club Leadership Application 2026-2027',
  sheetTitle: 'AI Club Leadership Applications 2026-2027 Responses',
  projectSubmitDeadline: 'Saturday, June 13, 2026 at 11:59 PM',
  showcaseDate: 'Monday, June 15, 2026',
  demoFormat: 'Up to 5 minutes total: 4-minute demo + 1-minute Q&A',
};

const ROLES = [
  'VP / COO — meeting ops, project-team check-ins, scrums, blockers, follow-through',
  'CMO / Social Media — announcements, Instagram/TikTok, clips, project showcases',
  'Treasurer / Resources — API budget, parent donations, reimbursements, tool access',
  'Secretary / Systems — attendance, notes, Canvas records, deadlines, AI Club Brain',
  'TA / Administrative Assistant — meeting help, member support, presentations',
  'Project Lead — owns a build team, keeps the team moving, makes demos real',
];

function createAIClubLeadershipApplication() {
  const form = FormApp.create(CONFIG.formTitle)
    .setDescription([
      'Use this form to apply for AI Club leadership for 2026-2027.',
      `Submit your best project by ${CONFIG.projectSubmitDeadline}.`,
      `Showcase date: ${CONFIG.showcaseDate}.`,
      `Demo format: ${CONFIG.demoFormat}.`,
      'We are looking for grit, AI/build skill, coding or vibe-coding ability, presentation skill, and role fit.',
      'Free tools count. Paid tools count. What matters is what you built and what you learned.',
    ].join('\n\n'))
    .setCollectEmail(true)
    .setAllowResponseEdits(true)
    .setConfirmationMessage('Submitted. Keep building before June 15.');

  const sheet = SpreadsheetApp.create(CONFIG.sheetTitle);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  form.addTextItem().setTitle('Full name').setRequired(true);
  form.addTextItem().setTitle('School email').setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  form.addListItem().setTitle('Grade next school year').setChoiceValues(['9', '10', '11', '12']).setRequired(true);
  form.addTextItem().setTitle('Discord username or phone number, optional');

  form.addCheckboxItem().setTitle('Which roles are you interested in?').setChoiceValues(ROLES).setRequired(true);
  form.addListItem().setTitle('Top choice role').setChoiceValues(ROLES).setRequired(true);
  form.addListItem().setTitle('Second choice role').setChoiceValues(['No second choice'].concat(ROLES)).setRequired(true);
  form.addParagraphTextItem().setTitle('Why are you a fit for your top-choice role?').setRequired(true);

  form.addTextItem().setTitle('Project title').setRequired(true);
  form.addParagraphTextItem().setTitle('One-paragraph project description').setRequired(true);
  form.addTextItem().setTitle('Project link').setRequired(true);
  form.addTextItem().setTitle('Code or GitHub link, optional');
  form.addCheckboxItem().setTitle('Tools used').setChoiceValues([
    'Claude Code', 'Codex', 'Cursor', 'Windsurf', 'ChatGPT', 'Gemini', 'Replit',
    'GitHub Copilot', 'Python', 'JavaScript / TypeScript', 'HTML / CSS',
    'No-code or low-code tool', 'Other',
  ]).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Was this solo or team-built?').setChoiceValues(['Solo', 'Team-built']).setRequired(true);
  form.addParagraphTextItem().setTitle('If team-built, what did you personally build?');
  form.addParagraphTextItem().setTitle('What broke, and how did you fix it?').setRequired(true);
  form.addParagraphTextItem().setTitle('What would you improve next?').setRequired(true);

  form.addTextItem().setTitle('Demo video link, optional but recommended');
  form.addTextItem().setTitle('Resume link fallback, optional');
  try {
    form.addFileUploadItem().setTitle('Resume upload').setRequired(false).setMaxFiles(1).setMaxFileSize(10);
  } catch (error) {
    form.addParagraphTextItem().setTitle('Resume upload unavailable. Paste a resume link above.');
  }

  form.addParagraphTextItem().setTitle('What is the strongest evidence that you have grit?').setRequired(true);
  form.addParagraphTextItem().setTitle('What is the strongest evidence that you can communicate or present well?').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Can you present live on June 15, 2026?')
    .setChoiceValues(['Yes', 'No, but I will submit a recorded demo', 'Not sure yet'])
    .setRequired(true);
  form.addCheckboxItem().setTitle('Leadership expectations').setChoiceValues([
    'I can attend at least 75% of AI Club meetings next year',
    'I can own weekly responsibilities without Reid or Ben chasing me',
    'I can respond to leadership messages within a reasonable time',
    'I understand leadership is not honorary',
    'I understand I may be moved out of leadership if I consistently do not perform',
  ]).setRequired(true);
  form.addParagraphTextItem().setTitle('What weekly responsibility can you realistically own?').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Summer availability').setChoiceValues([
    'I can help over the summer',
    'I can help a little over the summer',
    'I cannot help much over the summer',
  ]).setRequired(true);
  form.addCheckboxItem().setTitle('Final confirmations').setChoiceValues([
    'I represented my project honestly',
    'I disclosed team help or outside help where relevant',
    'I give AI Club permission to discuss or showcase my project internally',
    'I understand Reid and Ben will use this form plus the June 15 demo to make leadership decisions',
  ]).setRequired(true);
  form.addParagraphTextItem().setTitle('Anything else Reid and Ben should know?');

  sheet.insertSheet('Review Rubric').getRange(1, 1, 1, 5).setValues([[
    'Applicant', 'Grit', 'AI / build skill', 'Presentation skill', 'Role fit',
  ]]);
  sheet.insertSheet('Decision Notes').getRange(1, 1, 1, 6).setValues([[
    'Applicant', 'Recommended role', 'Evidence', 'Concern', 'Decision', 'Follow-up',
  ]]);

  Logger.log(`FORM_EDIT_URL: ${form.getEditUrl()}`);
  Logger.log(`FORM_PUBLIC_URL: ${form.getPublishedUrl()}`);
  Logger.log(`SHEET_URL: ${sheet.getUrl()}`);
}


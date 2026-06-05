import { z } from 'zod';

const splitArray = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      const trimmed = value.trim();
      const withoutBrackets = trimmed.startsWith('[') && trimmed.endsWith(']')
        ? trimmed.slice(1, -1)
        : trimmed;
      return withoutBrackets
        .split(withoutBrackets.includes('|') ? '|' : ',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
  }
  return [];
}, z.array(z.string().min(1)).min(1));

const optionalArray = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(value.includes('|') ? '|' : ',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
  }
  return [];
}, z.array(z.string().min(1)));

const textField = (min = 0) => z.string().trim().min(min).max(10000);
const optionalText = z.string().trim().max(10000).optional().or(z.literal(''));
const optionalUrl = z.string().trim().max(600).refine((value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, 'Must be a valid URL.').optional().or(z.literal(''));

const githubRepoUrl = z.string().trim().max(600).refine((value) => {
  if (!value) return true;
  return /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/.test(value);
}, 'GitHub repo links must look like https://github.com/username/project.');

const githubProfileUrl = z.string().trim().max(600).refine((value) => {
  if (!value) return true;
  return /^https:\/\/github\.com\/[^/\s]+\/?$/.test(value);
}, 'GitHub profile links must look like https://github.com/username.');

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(180),
  grade: z.enum(['9', '10', '11', '12']),
  contact: z.string().trim().max(120).optional().or(z.literal('')),

  rolesInterested: splitArray,
  topRole: z.string().trim().min(2).max(160),
  secondRole: z.string().trim().max(160).optional().or(z.literal('')),
  roleFit: textField().optional().or(z.literal('')),

  projectTitle: z.string().trim().min(2).max(160),
  projectDescription: textField().optional().or(z.literal('')),
  projectLink: z.url().max(600),
  codeLink: githubRepoUrl.optional().or(z.literal('')),
  toolsUsed: splitArray,
  otherTools: z.string().trim().max(300).optional().or(z.literal('')),
  soloOrTeam: z.enum(['Solo', 'Team-built']),
  personalContribution: optionalText,
  blocker: textField().optional().or(z.literal('')),
  nextImprovement: textField().optional().or(z.literal('')),

  demoVideoLink: optionalUrl,
  resumeLink: optionalUrl,
  githubProfile: githubProfileUrl.optional().or(z.literal('')),

  gritEvidence: textField().optional().or(z.literal('')),
  presentationEvidence: textField().optional().or(z.literal('')),
  june15Availability: z.enum(['Yes', 'No, but I will submit a recorded demo', 'Not sure yet']),
  activitiesNextYear: textField().optional().or(z.literal('')),
  mondayAttendance: z.enum([
    'Yes, I can attend most Monday meetings',
    'Usually, but I may have some conflicts',
    'No or not sure yet',
  ]),
  fullMeetingAvailability: z.enum([
    'Yes, I can usually stay the full time',
    'Usually, but I may need to leave early sometimes',
    'No or not sure yet',
  ]),
  attendanceConflicts: optionalText,
  demoAcknowledgements: optionalArray,
  leadershipExpectations: optionalArray,
  weeklyResponsibility: textField().optional().or(z.literal('')),
  summerAvailability: z.enum([
    'I can help over the summer',
    'I can help a little over the summer',
    'I cannot help much over the summer',
  ]),
  finalConfirmations: optionalArray,
  extraNotes: optionalText,
}).superRefine((data, ctx) => {
  if (data.toolsUsed.includes('Other') && !data.otherTools?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['otherTools'],
      message: 'Required when Other is selected.',
    });
  }
});

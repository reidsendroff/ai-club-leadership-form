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

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(180),
  grade: z.enum(['9', '10', '11', '12']),
  contact: z.string().trim().max(120).optional().or(z.literal('')),

  rolesInterested: splitArray,
  topRole: z.string().trim().min(2).max(160),
  secondRole: z.string().trim().max(160).optional().or(z.literal('')),
  roleFit: z.string().trim().min(30).max(2500),

  projectTitle: z.string().trim().min(2).max(160),
  projectDescription: z.string().trim().min(30).max(3000),
  projectLink: z.url().max(600),
  codeLink: z.string().trim().max(600).optional().or(z.literal('')),
  toolsUsed: splitArray,
  otherTools: z.string().trim().max(300).optional().or(z.literal('')),
  soloOrTeam: z.enum(['Solo', 'Team-built']),
  personalContribution: z.string().trim().max(2500).optional().or(z.literal('')),
  blocker: z.string().trim().min(30).max(3000),
  nextImprovement: z.string().trim().min(20).max(2000),

  demoVideoLink: z.string().trim().max(600).optional().or(z.literal('')),
  resumeLink: z.string().trim().max(600).optional().or(z.literal('')),

  gritEvidence: z.string().trim().min(30).max(2500),
  presentationEvidence: z.string().trim().min(30).max(2500),
  june15Availability: z.enum(['Yes', 'No, but I will submit a recorded demo', 'Not sure yet']),
  activitiesNextYear: z.string().trim().min(10).max(2000),
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
  attendanceConflicts: z.string().trim().max(1500).optional().or(z.literal('')),
  demoAcknowledgements: optionalArray,
  leadershipExpectations: optionalArray,
  weeklyResponsibility: z.string().trim().min(25).max(2500),
  summerAvailability: z.enum([
    'I can help over the summer',
    'I can help a little over the summer',
    'I cannot help much over the summer',
  ]),
  finalConfirmations: splitArray,
  extraNotes: z.string().trim().max(2000).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.toolsUsed.includes('Other') && !data.otherTools?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['otherTools'],
      message: 'Required when Other is selected.',
    });
  }
});

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import multer from 'multer';
import { format } from '@fast-csv/format';

import { ensureSchema, getResume, insertApplication, listApplications } from './db.js';
import { applicationSchema } from './validation.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const maxResumeMb = Number(process.env.MAX_RESUME_MB || 8);
const adminToken = process.env.ADMIN_TOKEN;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxResumeMb * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ]);
    if (!allowed.has(file.mimetype)) {
      cb(new Error('Resume must be a PDF, Word document, PNG, or JPG.'));
      return;
    }
    cb(null, true);
  },
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(compression());
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

function requireAdmin(req, res, next) {
  const token = req.query.token || req.get('x-admin-token');
  if (!adminToken) {
    res.status(500).json({ error: 'ADMIN_TOKEN is not configured.' });
    return;
  }
  if (token !== adminToken) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-club-leadership-form' });
});

app.post('/api/applications', upload.single('resumeFile'), async (req, res, next) => {
  try {
    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid application.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const saved = await insertApplication(parsed.data, req.file);
    res.status(201).json({
      ok: true,
      id: saved.id,
      createdAt: saved.created_at,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications', requireAdmin, async (_req, res, next) => {
  try {
    const rows = await listApplications();
    res.json({ applications: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/export.csv', requireAdmin, async (_req, res, next) => {
  try {
    const rows = await listApplications();
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.setHeader('content-disposition', 'attachment; filename="ai-club-leadership-applications.csv"');

    const csv = format({ headers: true });
    csv.pipe(res);
    for (const row of rows) {
      csv.write({
        ...row,
        roles_interested: row.roles_interested?.join('; '),
        tools_used: row.tools_used?.join('; '),
        demo_acknowledgements: row.demo_acknowledgements?.join('; '),
        leadership_expectations: row.leadership_expectations?.join('; '),
        final_confirmations: row.final_confirmations?.join('; '),
      });
    }
    csv.end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/applications/:id/resume', requireAdmin, async (req, res, next) => {
  try {
    const row = await getResume(req.params.id);
    if (!row?.resume_data) {
      res.status(404).json({ error: 'No resume uploaded for this application.' });
      return;
    }
    res.setHeader('content-type', row.resume_mimetype || 'application/octet-stream');
    res.setHeader('content-disposition', `attachment; filename="${encodeURIComponent(row.resume_filename || 'resume')}"`);
    res.send(row.resume_data);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: error.message || 'Server error.' });
});

await ensureSchema();

app.listen(port, () => {
  console.log(`AI Club Leadership Form listening on port ${port}`);
});


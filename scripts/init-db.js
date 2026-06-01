import 'dotenv/config';
import { ensureSchema, closePool } from '../src/db.js';

try {
  await ensureSchema();
  console.log('Database schema is ready.');
} finally {
  await closePool();
}


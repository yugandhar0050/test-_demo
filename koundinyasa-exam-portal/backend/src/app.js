import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool } from './db.js';
import auth from './routes/auth.js';
import exams from './routes/exams.js';
import attempts from './routes/attempts.js';
import dashboard from './routes/dashboard.js';
import student from './routes/student.js';
import results from './routes/results.js';
import notifications from './routes/notifications.js';
import admin from './routes/admin.js';
import dailyStudent from './routes/dailyStudent.js';
import dailyAdmin from './routes/dailyAdmin.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 900000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api/auth', auth);
app.use('/api/exams', exams);
app.use('/api/attempts', attempts);
app.use('/api/dashboard', dashboard);
app.use('/api/student', student);
app.use('/api/student', dailyStudent);
app.use('/api/results', results);
app.use('/api/notifications', notifications);
app.use('/api/admin', admin);
app.use('/api/admin', dailyAdmin);

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

app.use((e, req, res, next) => {
  console.error(e.message);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Unexpected server error.' : e.message });
});

export default app;
export { app };

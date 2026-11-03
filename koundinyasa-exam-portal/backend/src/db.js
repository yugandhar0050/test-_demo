import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const dbHost = databaseUrl ? new URL(databaseUrl).hostname : '';

const sslEnabled =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_SSL !== 'false' &&
    !['localhost', '127.0.0.1', 'db'].includes(dbHost));

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: sslEnabled ? { rejectUnauthorized: true } : false,
  max: Number(process.env.PG_MAX_CONNECTIONS || 5),
  connectionTimeoutMillis: 10000
});

pool.on('error', e => console.error('PostgreSQL pool error:', e.message));

export const query = (sql, params = []) => pool.query(sql, params);

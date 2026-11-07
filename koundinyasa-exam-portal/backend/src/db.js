
import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

const dbHost = databaseUrl
  ? new URL(databaseUrl).hostname
  : process.env.DB_HOST || 'localhost';

const sslEnabled =
  process.env.DB_SSL === 'true' ||
  (
    process.env.DB_SSL !== 'false' &&
    !['localhost', '127.0.0.1', 'db'].includes(dbHost)
  );

const sslConfig = sslEnabled
  ? {
      rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA_PATH
        ? {
            ca: readFileSync(
              process.env.DB_SSL_CA_PATH,
              'utf8'
            )
          }
        : {})
    }
  : false;

const connectionConfig = databaseUrl
  ? { connectionString: databaseUrl }
  : {
      host: dbHost,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'examportal',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };

export const pool = new Pool({
  ...connectionConfig,
  ssl: sslConfig,
  max: Number(process.env.PG_MAX_CONNECTIONS || 5),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error.message);
});

export const query = (sql, params = []) =>
  pool.query(sql, params);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    const dbInfo = await client.query('SELECT current_database(), current_user');
    console.log(`[migrate] Connected to database: ${dbInfo.rows[0].current_database} as user: ${dbInfo.rows[0].current_user}`);

    // 1. Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name varchar(255) PRIMARY KEY,
        applied_at timestamptz DEFAULT now()
      );
    `);

    // 2. Fetch already applied migrations
    const appliedResult = await client.query('SELECT name FROM schema_migrations ORDER BY name');
    const appliedSet = new Set(appliedResult.rows.map(r => r.name));

    // 3. Check for pre-existing tables to baseline historical migrations (001, 002, 003)
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = new Set(tablesResult.rows.map(r => r.table_name));

    if (!appliedSet.has('001_initial_schema.sql') && existingTables.has('users')) {
      console.log('[migrate] Baselining existing schema for 001_initial_schema.sql');
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', ['001_initial_schema.sql']);
      appliedSet.add('001_initial_schema.sql');
    }

    if (!appliedSet.has('002_student_topic_progress.sql') && existingTables.has('student_topic_progress')) {
      console.log('[migrate] Baselining existing schema for 002_student_topic_progress.sql');
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', ['002_student_topic_progress.sql']);
      appliedSet.add('002_student_topic_progress.sql');
    }

    if (!appliedSet.has('003_student_assigned_topics.sql') && existingTables.has('student_assigned_topics')) {
      console.log('[migrate] Baselining existing schema for 003_student_assigned_topics.sql');
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', ['003_student_assigned_topics.sql']);
      appliedSet.add('003_student_assigned_topics.sql');
    }

    // 4. Discover and sort migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pending = files.filter(f => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log('[migrate] Database is already up to date. No pending migrations.');
      return;
    }

    console.log(`[migrate] Found ${pending.length} pending migration(s): ${pending.join(', ')}`);

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[migrate] Applying ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] Successfully applied ${file}`);
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        console.error(`[migrate] Failed applying ${file}:`, migrationErr.message);
        throw migrationErr;
      }
    }

    console.log('[migrate] All pending migrations successfully applied.');
  } finally {
    client.release();
  }
}

try {
  await runMigrations();
} catch (e) {
  console.error('[migrate] Migration process failed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}


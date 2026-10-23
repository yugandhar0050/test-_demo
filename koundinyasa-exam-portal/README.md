# Koundinyasa Student Examination Portal

Full-stack starter project: React/Vite frontend, Express REST API, PostgreSQL database, student authentication, exam browsing, answer persistence, results, and role-based admin tools.

## Run locally
1. Install Node.js 20+ and PostgreSQL (or use your managed PostgreSQL instance).
2. Backend:
   ```bash
   cd backend
   cp .env.example .env
   # Set DATABASE_URL and a strong JWT_SECRET in .env
   npm install
   npm run migrate
   npm run dev
   ```
3. Frontend in another terminal:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
4. Open http://localhost:5173. API runs on http://localhost:5000.

## Admin bootstrap
Public registration creates student accounts only. Create your own account, then promote the intended account through a trusted database session:
```sql
UPDATE users SET role='admin' WHERE student_id='294001';
```
Change the ID to your actual account. Never expose this operation publicly.

## Security
The database connection string shared in chat is intentionally not included in the ZIP. Put your credentials in `backend/.env`, never commit `.env`, and rotate any real password that was shared. This is a development foundation and needs security review, load testing, backups, and institution policy review before high-stakes use.

Student IDs currently follow the brief's six-digit `294xxx` policy. Edit the validation if your institution uses another format.

## Continuous Integration (CI)

A GitHub Actions pipeline (`.github/workflows/ci.yml`) automatically runs on:
- Pushes to `main`
- Pull requests targeting `main`
- Manual trigger (`workflow_dispatch`)

### Verification Checks:
1. **Backend Unit Tests:** Runs `npm run test:unit` (20 tests covering schemas, domain selection, decimal study hours, compliance deadlines, and student ID format) with zero database dependencies.
2. **Database Migrations & Integration Tests:** Launches a dedicated, isolated PostgreSQL service container in CI, executes all schema migrations (`001` to `006`), and runs `npm run test:integration` against a temporary test server with synthetic data. Production credentials and data are never used in CI.
3. **Frontend Production Build:** Executes `npm ci` and `npm run build` in `frontend/` to verify React 18 / Vite 6 asset compilation and detect syntax or bundling errors.

Results and logs can be reviewed in the repository's **Actions** tab on GitHub.

import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => {
  console.log('Exam Portal API listening on ' + port);
});

let isShuttingDown = false;
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('[server] HTTP server closed.');
    try {
      await pool.end();
      console.log('[server] Database pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('[server] Error closing database pool:', err.message);
      process.exit(1);
    }
  });
  setTimeout(() => {
    console.error('[server] Shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 5000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;


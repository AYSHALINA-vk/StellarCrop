import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ───────────────────────────────────────
app.get('/health', async (_req, res) => {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (_) { /* db remains false */ }
  res.json({ status: 'ok', db });
});

// ── API routes ─────────────────────────────────────────
app.use('/api', routes);

// ── Global error handler (must be last) ────────────────
app.use(errorHandler);

export default app;

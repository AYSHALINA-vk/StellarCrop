import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── API routes ─────────────────────────────────────────
app.use('/api', routes);

// ── Global error handler (must be last) ────────────────
app.use(errorHandler);

export default app;

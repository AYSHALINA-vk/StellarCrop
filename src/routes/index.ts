import { Router } from 'express';
import usersRouter from './users.routes';
import batchesRouter from './batches.routes';
import transactionsRouter from './transactions.routes';
import { prisma } from '../lib/prisma';

const router = Router();

router.use('/users', usersRouter);
router.use('/batches', batchesRouter);
router.use('/transactions', transactionsRouter);

router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: true });
  } catch {
    res.status(500).json({ status: 'error', db: false });
  }
});

export default router;
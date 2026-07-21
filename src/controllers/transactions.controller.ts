import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../types';

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId, fromUserId, toUserId } = req.query;
    const transactions = await prisma.transaction.findMany({
      where: {
        ...(batchId && { batchId: batchId as string }),
        ...(fromUserId && { fromUserId: fromUserId as string }),
        ...(toUserId && { toUserId: toUserId as string }),
      },
      include: {
        batch: { select: { id: true, cropType: true, status: true } },
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
}

export async function getTransactionById(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        batch: true,
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });
    if (!transaction) throw new AppError('Transaction not found', 404);
    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
}

export async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const { batchId, fromUserId, toUserId, stellarTxHash } = req.body;
    const transaction = await prisma.transaction.create({
      data: { batchId, fromUserId, toUserId, stellarTxHash },
    });
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, stellarTxHash } = req.body;
    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(stellarTxHash !== undefined && { stellarTxHash }),
      },
    });
    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
}

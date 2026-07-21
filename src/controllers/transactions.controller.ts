import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../types';
import { BatchStatus } from '@prisma/client';
import { transferBatch } from '../lib/stellar/transferBatch';

/**
 * Maps a recipient's role to the corresponding BatchStatus after transfer.
 */
function statusForRecipientRole(role: string): BatchStatus {
  switch (role) {
    case 'WHOLESALER':   return BatchStatus.WITH_WHOLESALER;
    case 'RETAILER':     return BatchStatus.WITH_RETAILER;
    case 'CONSUMER':     return BatchStatus.SOLD;
    default:             return BatchStatus.RESERVED;
  }
}

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
    const { batchId, fromUserId, toUserId } = req.body;

    // ── 1. Look up the batch ──
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new AppError('Batch not found', 404);
    if (!batch.stellarAssetCode) {
      throw new AppError('Batch does not have a Stellar asset code — issue it first', 400);
    }

    // ── 2. Look up both users and their Stellar keys ──
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId } }),
      prisma.user.findUnique({ where: { id: toUserId } }),
    ]);
    if (!fromUser) throw new AppError('Sender (fromUser) not found', 404);
    if (!toUser) throw new AppError('Recipient (toUser) not found', 404);
    if (!fromUser.stellarSecretKey) {
      throw new AppError('Sender does not have a Stellar secret key configured', 400);
    }
    if (!toUser.stellarSecretKey) {
      throw new AppError('Recipient does not have a Stellar secret key configured', 400);
    }

    // ── 3. Look up the issuer (farmer who created the batch) ──
    const farmer = await prisma.user.findUnique({ where: { id: batch.farmerId } });
    if (!farmer || !farmer.stellarPublicKey) {
      throw new AppError('Batch issuer (farmer) not found or missing Stellar public key', 400);
    }

    // ── 4. Execute the Stellar custody transfer ──
    const transfer = await transferBatch(
      batch.stellarAssetCode,
      farmer.stellarPublicKey,
      fromUser.stellarSecretKey,
      toUser.stellarSecretKey,
    );

    // ── 5. Create the Transaction row with status COMPLETED ──
    const transaction = await prisma.transaction.create({
      data: {
        batchId,
        fromUserId,
        toUserId,
        stellarTxHash: transfer.transactionHash,
        status: 'COMPLETED',
      },
      include: {
        batch: { select: { id: true, cropType: true, status: true } },
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });

    // ── 6. Update the batch status based on recipient's role ──
    const newBatchStatus = statusForRecipientRole(toUser.role);
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: { status: newBatchStatus },
    });

    res.status(201).json({
      success: true,
      data: transaction,
      batchStatusUpdate: {
        batchId: updatedBatch.id,
        previousStatus: batch.status,
        newStatus: updatedBatch.status,
      },
      stellar: {
        transactionHash: transfer.transactionHash,
      },
    });
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

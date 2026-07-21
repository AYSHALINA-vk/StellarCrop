import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../types';
import { BatchStatus } from '@prisma/client';
import { issueBatchAsset } from '../lib/stellar/issueBatchAsset';
import { anchorBatchHash } from '../lib/stellar/anchorBatchHash';

export async function listBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const { farmerId, status, region } = req.query;
    const batches = await prisma.batch.findMany({
      where: {
        ...(farmerId && { farmerId: farmerId as string }),
        ...(status && { status: status as BatchStatus }),
        ...(region && { region: region as string }),
      },
      include: { farmer: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: batches });
  } catch (err) {
    next(err);
  }
}

export async function getBatchById(req: Request, res: Response, next: NextFunction) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        farmer: { select: { id: true, name: true, role: true } },
        transactions: true,
      },
    });
    if (!batch) throw new AppError('Batch not found', 404);
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      farmerId, cropType, quantity, harvestDate,
      expiryDate, region,
    } = req.body;

    // ── 1. Look up the farmer and their Stellar secret key ──
    const farmer = await prisma.user.findUnique({ where: { id: farmerId } });
    if (!farmer) throw new AppError('Farmer not found', 404);
    if (!farmer.stellarSecretKey) {
      throw new AppError('Farmer does not have a Stellar secret key configured', 400);
    }

    // ── 2. Create the batch row in Postgres (status: HARVESTED) ──
    let batch = await prisma.batch.create({
      data: {
        farmerId,
        cropType,
        quantity,
        harvestDate: new Date(harvestDate),
        expiryDate: new Date(expiryDate),
        region,
      },
    });

    // ── 3. Issue the batch asset on Stellar ──
    const issued = await issueBatchAsset(farmer.stellarSecretKey, batch.id);

    // ── 4. Anchor the batch data hash on Stellar ──
    const batchDataForHash = { cropType, quantity, harvestDate, expiryDate, region };
    const anchored = await anchorBatchHash(farmer.stellarSecretKey, batch.id, batchDataForHash);

    // ── 5. Update the batch row with Stellar asset code & data hash ──
    batch = await prisma.batch.update({
      where: { id: batch.id },
      data: {
        stellarAssetCode: issued.assetCode,
        dataHash: anchored.hash,
      },
      include: {
        farmer: { select: { id: true, name: true, role: true, stellarPublicKey: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: batch,
      stellar: {
        assetCode: issued.assetCode,
        issueTransactionHash: issued.transactionHash,
        anchorTransactionHash: anchored.transactionHash,
        dataHash: anchored.hash,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      cropType, quantity, harvestDate, expiryDate,
      region, status, stellarAssetCode, dataHash,
    } = req.body;

    const batch = await prisma.batch.update({
      where: { id: req.params.id },
      data: {
        ...(cropType !== undefined && { cropType }),
        ...(quantity !== undefined && { quantity }),
        ...(harvestDate !== undefined && { harvestDate: new Date(harvestDate) }),
        ...(expiryDate !== undefined && { expiryDate: new Date(expiryDate) }),
        ...(region !== undefined && { region }),
        ...(status !== undefined && { status }),
        ...(stellarAssetCode !== undefined && { stellarAssetCode }),
        ...(dataHash !== undefined && { dataHash }),
      },
    });
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

export async function deleteBatch(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.batch.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    next(err);
  }
}

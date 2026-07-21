import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../types';
import { BatchStatus } from '@prisma/client';

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
      expiryDate, region, stellarAssetCode, dataHash,
    } = req.body;

    const batch = await prisma.batch.create({
      data: {
        farmerId,
        cropType,
        quantity,
        harvestDate: new Date(harvestDate),
        expiryDate: new Date(expiryDate),
        region,
        stellarAssetCode,
        dataHash,
      },
    });
    res.status(201).json({ success: true, data: batch });
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

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../types';
import { Keypair } from '@stellar/stellar-sdk';

const FRIENDBOT_URL = 'https://friendbot.stellar.org';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { batches: true },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, role } = req.body;

    // ── 1. Generate a new Stellar keypair ──────────────
    const keypair = Keypair.random();
    const stellarPublicKey = keypair.publicKey();
    const stellarSecretKey = keypair.secret();

    // ── 2. Fund the account on testnet via Friendbot ───
    const fundRes = await fetch(
      `${FRIENDBOT_URL}?addr=${encodeURIComponent(stellarPublicKey)}`,
    );
    if (!fundRes.ok) {
      throw new AppError(
        `Failed to fund Stellar account via Friendbot (${fundRes.status})`,
        502,
      );
    }

    // ── 3. Create the user with Stellar keys ───────────
    const user = await prisma.user.create({
      data: { email, name, role, stellarPublicKey, stellarSecretKey },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(email !== undefined && { email }),
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

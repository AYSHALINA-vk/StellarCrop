/**
 * Stellar Batch Data Hash Anchoring
 * -----------------------------------
 * Anchors a SHA-256 hash of batch data on-chain via Stellar's manageData
 * operation, enabling tamper-proof verification of crop batch integrity.
 *
 * - manageData keys: max 64 chars → we use "batch_<batchId>" (6 + 36 = 42 chars for UUID)
 * - manageData values: max 64 bytes → SHA-256 hex string is 64 chars (64 bytes ASCII), fits exactly
 */

import { createHash } from 'crypto';
import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export interface AnchorHashResult {
  hash: string;
  transactionHash: string;
}

/**
 * Computes a SHA-256 hash of `batchData` and anchors it on-chain
 * as a manageData entry on the farmer's Stellar account.
 *
 * @param farmerSecretKey - The farmer's Stellar secret key
 * @param batchId         - The internal batch UUID
 * @param batchData       - The batch data object to hash
 * @returns { hash, transactionHash }
 */
export async function anchorBatchHash(
  farmerSecretKey: string,
  batchId: string,
  batchData: object,
): Promise<AnchorHashResult> {
  // ── 1. Compute SHA-256 of the batch data ─────────────
  const jsonString = JSON.stringify(batchData);
  const hash = createHash('sha256').update(jsonString).digest('hex');

  // ── 2. Load farmer keypair & account ─────────────────
  const farmerKeypair = Keypair.fromSecret(farmerSecretKey);
  const publicKey = farmerKeypair.publicKey();
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(publicKey);

  // ── 3. Build manageData key (max 64 chars) ───────────
  // "batch_" (6 chars) + UUID (36 chars) = 42 chars — well within limit
  const dataKey = `batch_${batchId}`.substring(0, 64);

  // ── 4. Build & submit the transaction ────────────────
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.manageData({
        name: dataKey,
        value: hash, // 64-char hex string = 64 bytes, fits exactly
      }),
    )
    .setTimeout(30)
    .build();

  transaction.sign(farmerKeypair);
  const result = await server.submitTransaction(transaction);

  return {
    hash,
    transactionHash: result.hash,
  };
}

/**
 * Verifies that batch data matches the hash stored on-chain.
 *
 * Fetches the account's data entries from Horizon, decodes the stored
 * hash from base64, recomputes the hash from `batchData`, and compares.
 *
 * @param accountPublicKey - The farmer's Stellar public key
 * @param batchId          - The internal batch UUID
 * @param batchData        - The batch data object to verify
 * @returns true if the hash matches, false otherwise
 */
export async function verifyBatchHash(
  accountPublicKey: string,
  batchId: string,
  batchData: object,
): Promise<boolean> {
  // ── 1. Fetch account data entries from Horizon ───────
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(accountPublicKey);

  // ── 2. Look up the stored hash ───────────────────────
  const dataKey = `batch_${batchId}`.substring(0, 64);
  const storedBase64 = account.data_attr[dataKey];

  if (!storedBase64) {
    console.warn(`⚠ No data entry found for key "${dataKey}"`);
    return false;
  }

  // Horizon returns data values as base64-encoded strings
  const storedHash = Buffer.from(storedBase64, 'base64').toString('utf-8');

  // ── 3. Recompute hash from current batchData ─────────
  const jsonString = JSON.stringify(batchData);
  const computedHash = createHash('sha256').update(jsonString).digest('hex');

  // ── 4. Compare ───────────────────────────────────────
  return storedHash === computedHash;
}

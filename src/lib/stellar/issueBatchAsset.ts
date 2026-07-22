/**
 * Stellar Batch Asset Issuance
 * ----------------------------
 * Issues a unique Stellar asset representing a crop batch on the testnet.
 *
 * Stellar protocol notes:
 * - The farmer's account acts as the **issuer** of the asset.
 * - An issuer implicitly has infinite supply of their own asset and does NOT
 *   need a trustline to it (changeTrust to own asset is rejected by the
 *   network with CHANGE_TRUST_SELF_NOT_ALLOWED).
 * - A payment from the issuer to themselves is valid on-ledger — it mints
 *   and immediately burns 1 unit, creating a real transaction that proves
 *   the asset exists on-chain.
 * - We also store the batchId in a manageData entry so the mapping between
 *   Stellar asset code and internal batchId is recorded on-chain.
 */

import {
  Keypair,
  Horizon,
  Asset,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
} from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export interface IssueBatchAssetResult {
  assetCode: string;
  issuerPublicKey: string;
  transactionHash: string;
}

/**
 * Issues a Stellar asset for a crop batch.
 *
 * @param farmerSecretKey  - The farmer's Stellar secret key (issuer)
 * @param batchId          - The internal batch UUID
 * @returns { assetCode, issuerPublicKey, transactionHash }
 */
export async function issueBatchAsset(
  farmerSecretKey: string,
  batchId: string,
): Promise<IssueBatchAssetResult> {
  // ── 1. Load the farmer's keypair ─────────────────────
  const farmerKeypair = Keypair.fromSecret(farmerSecretKey);
  const issuerPublicKey = farmerKeypair.publicKey();

  // ── 2. Generate a unique asset code (max 12 chars) ───
  // Format: "CROP" + first 8 hex chars of batchId (hyphens stripped)
  // Example batchId "a1b2c3d4-e5f6-..." → asset code "CROPA1B2C3D4"
  const hexChars = batchId.replace(/-/g, '').substring(0, 8).toUpperCase();
  const assetCode = `CROP${hexChars}`;

  // ── 3. Create the Stellar Asset object ───────────────
  const asset = new Asset(assetCode, issuerPublicKey);

  // ── 4. Load the farmer's account from Horizon ────────
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(issuerPublicKey);

  // ── 5. Build the transaction ─────────────────────────
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    // Store batch → asset mapping on-chain via manageData
    .addOperation(
      Operation.manageData({
        name: `batch:${assetCode}`,
        value: batchId,
      }),
    )
    // Self-payment: issuer sends 1 unit of the asset to themselves.
    // This creates a valid on-ledger transaction referencing the asset,
    // effectively "activating" it on the Stellar network.
    .addOperation(
      Operation.payment({
        destination: issuerPublicKey,
        asset: asset,
        amount: '1',
      }),
    )
    .setTimeout(30)
    .build();

    async function submitWithRetry(server: any, tx: any, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await server.submitTransaction(tx);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

  // ── 6. Sign & submit ────────────────────────────────
  transaction.sign(farmerKeypair);
  const result = await server.submitTransaction(transaction);

  return {
    assetCode,
    issuerPublicKey,
    transactionHash: result.hash,
  };
}

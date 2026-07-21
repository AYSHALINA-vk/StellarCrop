/**
 * Stellar Batch Custody Transfer
 * --------------------------------
 * Transfers 1 unit of a batch asset from one user to another on the
 * Stellar testnet, establishing a trustline for the recipient if needed.
 *
 * If the recipient already holds a trustline to the asset, only a payment
 * operation is submitted. Otherwise, both changeTrust and payment are
 * bundled into a single atomic transaction signed by both parties.
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

export interface TransferBatchResult {
  transactionHash: string;
}

/**
 * Checks whether an account already has a trustline to the given asset.
 */
async function hasTrustline(
  server: Horizon.Server,
  publicKey: string,
  asset: Asset,
): Promise<boolean> {
  const account = await server.loadAccount(publicKey);
  return account.balances.some((b) => {
    if (b.asset_type === 'native') return false;
    const bal = b as Horizon.HorizonApi.BalanceLineAsset;
    return bal.asset_code === asset.getCode() && bal.asset_issuer === asset.getIssuer();
  });
}

/**
 * Transfers 1 unit of a batch asset between two Stellar accounts.
 *
 * @param assetCode       - The Stellar asset code (e.g. "CRP97878BBCD")
 * @param issuerPublicKey - The public key of the asset issuer (farmer)
 * @param fromSecretKey   - Secret key of the sender
 * @param toSecretKey     - Secret key of the recipient
 * @returns { transactionHash }
 */
export async function transferBatch(
  assetCode: string,
  issuerPublicKey: string,
  fromSecretKey: string,
  toSecretKey: string,
): Promise<TransferBatchResult> {
  // ── 1. Load both keypairs ────────────────────────────
  const fromKeypair = Keypair.fromSecret(fromSecretKey);
  const toKeypair = Keypair.fromSecret(toSecretKey);

  // ── 2. Define the asset ──────────────────────────────
  const asset = new Asset(assetCode, issuerPublicKey);

  // ── 3. Connect to Horizon ────────────────────────────
  const server = new Horizon.Server(HORIZON_URL);

  // ── 4. Check if recipient needs a trustline ──────────
  const recipientHasTrust = await hasTrustline(server, toKeypair.publicKey(), asset);

  // ── 5. Build the transaction ─────────────────────────
  // Use the sender's account as the transaction source
  const senderAccount = await server.loadAccount(fromKeypair.publicKey());

  const builder = new TransactionBuilder(senderAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  });

  if (!recipientHasTrust) {
    // Add changeTrust with source override → recipient's account
    // This lets us bundle trustline + payment in one atomic transaction
    builder.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: toKeypair.publicKey(),
      }),
    );
  }

  // Payment: send 1 unit from sender to recipient
  builder.addOperation(
    Operation.payment({
      destination: toKeypair.publicKey(),
      asset: asset,
      amount: '1',
    }),
  );

  const transaction = builder.setTimeout(30).build();

  // ── 6. Sign the transaction ──────────────────────────
  // Sender always signs (source account + payment operation)
  transaction.sign(fromKeypair);

  // Recipient signs only if we added a changeTrust operation for them
  if (!recipientHasTrust) {
    transaction.sign(toKeypair);
  }

  // ── 7. Submit ────────────────────────────────────────
  const result = await server.submitTransaction(transaction);

  return {
    transactionHash: result.hash,
  };
}

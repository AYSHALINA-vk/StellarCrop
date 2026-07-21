/**
 * Test: Transfer a Batch Asset from Farmer → Wholesaler on Stellar Testnet
 * -------------------------------------------------------------------------
 * 1. Creates & funds a farmer account, issues a batch asset
 * 2. Creates & funds a wholesaler account
 * 3. Transfers 1 unit of the batch asset from farmer to wholesaler
 * 4. Fetches wholesaler balances and confirms the asset is held
 *
 * Run: npm run stellar:transfer-test
 */

import { Keypair, Horizon } from '@stellar/stellar-sdk';
import { randomUUID } from 'crypto';
import { issueBatchAsset } from '../lib/stellar/issueBatchAsset';
import { transferBatch } from '../lib/stellar/transferBatch';

const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

async function fundAccount(keypair: Keypair, label: string): Promise<void> {
  console.log(`💰  Funding ${label} via Friendbot...`);
  const res = await fetch(
    `${FRIENDBOT_URL}?addr=${encodeURIComponent(keypair.publicKey())}`,
  );
  if (!res.ok) {
    throw new Error(`Friendbot failed for ${label} (${res.status}): ${await res.text()}`);
  }
  console.log(`   ✅ ${label} funded!\n`);
}

async function main() {
  console.log('━'.repeat(60));
  console.log('🚚  Stellar Batch Transfer Test: Farmer → Wholesaler');
  console.log('━'.repeat(60));
  console.log();

  // ── 1. Create & fund farmer account ──────────────────
  const farmer = Keypair.random();
  console.log(`🌾  Farmer  Public Key: ${farmer.publicKey()}`);
  await fundAccount(farmer, 'Farmer');

  // ── 2. Issue a batch asset ───────────────────────────
  const batchId = randomUUID();
  console.log(`📦  Batch ID: ${batchId}`);
  console.log('🚀  Issuing batch asset...');
  const issued = await issueBatchAsset(farmer.secret(), batchId);
  console.log(`   ✅ Asset issued: ${issued.assetCode}`);
  console.log(`   Tx: ${issued.transactionHash}\n`);

  // ── 3. Create & fund wholesaler account ──────────────
  const wholesaler = Keypair.random();
  console.log(`🏪  Wholesaler Public Key: ${wholesaler.publicKey()}`);
  await fundAccount(wholesaler, 'Wholesaler');

  // ── 4. Transfer batch asset: farmer → wholesaler ─────
  console.log('📤  Transferring batch asset: Farmer → Wholesaler...');
  const transfer = await transferBatch(
    issued.assetCode,
    issued.issuerPublicKey,
    farmer.secret(),
    wholesaler.secret(),
  );
  console.log(`   ✅ Transfer complete!`);
  console.log(`   Tx: ${transfer.transactionHash}\n`);

  // ── 5. Verify wholesaler balance ─────────────────────
  console.log('🔍  Fetching wholesaler balances from Horizon...');
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(wholesaler.publicKey());

  let assetBalance: string | null = null;
  for (const bal of account.balances) {
    if (bal.asset_type !== 'native') {
      const b = bal as Horizon.HorizonApi.BalanceLineAsset;
      if (b.asset_code === issued.assetCode && b.asset_issuer === issued.issuerPublicKey) {
        assetBalance = b.balance;
      }
    }
  }

  // ── 6. Print results ────────────────────────────────
  console.log();
  console.log('━'.repeat(60));
  console.log('✨  Transfer Results');
  console.log('━'.repeat(60));
  console.log(`   Asset Code:        ${issued.assetCode}`);
  console.log(`   Issuer (Farmer):   ${farmer.publicKey()}`);
  console.log(`   Recipient (Whslr): ${wholesaler.publicKey()}`);
  console.log(`   Issue Tx:          ${issued.transactionHash}`);
  console.log(`   Transfer Tx:       ${transfer.transactionHash}`);
  console.log();

  if (assetBalance !== null) {
    console.log(`   Wholesaler ${issued.assetCode} Balance: ${assetBalance}`);
    const holds1Unit = parseFloat(assetBalance) === 1;
    console.log(`   Holds 1 unit:      ${holds1Unit ? '✅ YES' : '❌ NO'}`);
    console.log();
    console.log(`   🔗 View transfer: https://stellar.expert/explorer/testnet/tx/${transfer.transactionHash}`);
  } else {
    console.log(`   ❌ Asset ${issued.assetCode} NOT found in wholesaler balances!`);
  }
  console.log('━'.repeat(60));
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
  if (err.response?.data?.extras?.result_codes) {
    console.error('   Stellar result codes:', JSON.stringify(err.response.data.extras.result_codes));
  }
  process.exit(1);
});

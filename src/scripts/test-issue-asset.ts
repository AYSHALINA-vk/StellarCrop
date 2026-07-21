/**
 * Test: Issue a Stellar Batch Asset on Testnet
 * ---------------------------------------------
 * 1. Generates a new Stellar keypair and funds it via Friendbot
 * 2. Creates a fake batchId (UUID)
 * 3. Calls issueBatchAsset() to issue the asset on-chain
 * 4. Prints the result
 *
 * Run: npm run stellar:issue-test
 */

import { Keypair } from '@stellar/stellar-sdk';
import { randomUUID } from 'crypto';
import { issueBatchAsset } from '../lib/stellar/issueBatchAsset';

const FRIENDBOT_URL = 'https://friendbot.stellar.org';

async function main() {
  // ── 1. Generate & fund a test farmer account ─────────
  const farmer = Keypair.random();
  console.log('━'.repeat(60));
  console.log('🌾  Stellar Batch Asset Issuance Test');
  console.log('━'.repeat(60));
  console.log(`   Farmer Public Key:  ${farmer.publicKey()}`);
  console.log(`   Farmer Secret Key:  ${farmer.secret()}`);
  console.log();

  console.log('💰  Funding farmer account via Friendbot...');
  const fundRes = await fetch(
    `${FRIENDBOT_URL}?addr=${encodeURIComponent(farmer.publicKey())}`,
  );
  if (!fundRes.ok) {
    throw new Error(`Friendbot failed (${fundRes.status}): ${await fundRes.text()}`);
  }
  console.log('   ✅ Farmer account funded!\n');

  // ── 2. Generate a fake batchId ───────────────────────
  const batchId = randomUUID();
  console.log(`📦  Batch ID: ${batchId}\n`);

  // ── 3. Issue the asset ───────────────────────────────
  console.log('🚀  Issuing batch asset on Stellar testnet...');
  const result = await issueBatchAsset(farmer.secret(), batchId);

  // ── 4. Print result ──────────────────────────────────
  console.log();
  console.log('━'.repeat(60));
  console.log('✨  Asset Issued Successfully');
  console.log('━'.repeat(60));
  console.log(`   Asset Code:       ${result.assetCode}`);
  console.log(`   Issuer:           ${result.issuerPublicKey}`);
  console.log(`   Transaction Hash: ${result.transactionHash}`);
  console.log(`   Batch ID:         ${batchId}`);
  console.log(`   Network:          Stellar Testnet`);
  console.log();
  console.log(`   🔗 View on Stellar Expert:`);
  console.log(`      https://stellar.expert/explorer/testnet/tx/${result.transactionHash}`);
  console.log('━'.repeat(60));
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
  if (err.response?.data?.extras?.result_codes) {
    console.error('   Stellar result codes:', JSON.stringify(err.response.data.extras.result_codes));
  }
  process.exit(1);
});

/**
 * Test: Anchor & Verify Batch Data Hash on Stellar Testnet
 * ---------------------------------------------------------
 * 1. Generates a new keypair and funds it via Friendbot
 * 2. Anchors a sample batch data object on-chain
 * 3. Verifies the hash matches (expect: true)
 * 4. Tampers with a field and verifies again (expect: false)
 *
 * Run: npm run stellar:anchor-test
 */

import { Keypair } from '@stellar/stellar-sdk';
import { randomUUID } from 'crypto';
import { anchorBatchHash, verifyBatchHash } from '../lib/stellar/anchorBatchHash';

const FRIENDBOT_URL = 'https://friendbot.stellar.org';

async function main() {
  // ── 1. Generate & fund a test farmer account ─────────
  const farmer = Keypair.random();
  console.log('━'.repeat(60));
  console.log('🔒  Stellar Batch Hash Anchoring Test');
  console.log('━'.repeat(60));
  console.log(`   Farmer Public Key:  ${farmer.publicKey()}`);
  console.log();

  console.log('💰  Funding farmer account via Friendbot...');
  const fundRes = await fetch(
    `${FRIENDBOT_URL}?addr=${encodeURIComponent(farmer.publicKey())}`,
  );
  if (!fundRes.ok) {
    throw new Error(`Friendbot failed (${fundRes.status}): ${await fundRes.text()}`);
  }
  console.log('   ✅ Farmer account funded!\n');

  // ── 2. Sample batch data ─────────────────────────────
  const batchId = randomUUID();
  const batchData = {
    cropType: 'Organic Wheat',
    quantity: 500,
    harvestDate: '2026-07-15',
    region: 'Punjab',
    grade: 'A',
  };

  console.log(`📦  Batch ID:   ${batchId}`);
  console.log(`📋  Batch Data: ${JSON.stringify(batchData, null, 2)}`);
  console.log();

  // ── 3. Anchor the hash ───────────────────────────────
  console.log('⛓️   Anchoring batch hash on Stellar testnet...');
  const result = await anchorBatchHash(farmer.secret(), batchId, batchData);

  console.log('━'.repeat(60));
  console.log('📝  Hash Anchored');
  console.log('━'.repeat(60));
  console.log(`   SHA-256 Hash:     ${result.hash}`);
  console.log(`   Transaction Hash: ${result.transactionHash}`);
  console.log(`   🔗 https://stellar.expert/explorer/testnet/tx/${result.transactionHash}`);
  console.log();

  // ── 4. Verify with original data (should be TRUE) ────
  console.log('✅  Verifying with ORIGINAL data...');
  const isValid = await verifyBatchHash(farmer.publicKey(), batchId, batchData);
  console.log(`   Match: ${isValid ? '✅ TRUE — data is intact' : '❌ FALSE — unexpected!'}`);
  console.log();

  // ── 5. Tamper with one field & verify (should be FALSE)
  const tamperedData = { ...batchData, quantity: 999 };
  console.log('🔧  Verifying with TAMPERED data (quantity: 500 → 999)...');
  const isTampered = await verifyBatchHash(farmer.publicKey(), batchId, tamperedData);
  console.log(`   Match: ${isTampered ? '❌ TRUE — this should not happen!' : '✅ FALSE — tampering detected!'}`);
  console.log();

  // ── 6. Summary ───────────────────────────────────────
  console.log('━'.repeat(60));
  console.log('✨  Test Summary');
  console.log('━'.repeat(60));
  console.log(`   Original data verification:  ${isValid ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`   Tampered data detection:     ${!isTampered ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`   Overall:                     ${isValid && !isTampered ? 'ALL PASSED ✅' : 'SOME FAILED ❌'}`);
  console.log('━'.repeat(60));
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});

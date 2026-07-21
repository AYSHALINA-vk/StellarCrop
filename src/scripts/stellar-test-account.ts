/**
 * Stellar Testnet Account Generator
 * ----------------------------------
 * Standalone script (not wired to the API) that:
 * 1. Generates a new Stellar keypair
 * 2. Funds it on testnet via Friendbot
 * 3. Fetches the account from Horizon and prints its XLM balance
 * 4. Prints both public key and secret key
 *
 * Run: npm run stellar:test
 */

import { Keypair, Horizon } from '@stellar/stellar-sdk';

const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

async function main() {
  // ── 1. Generate keypair ──────────────────────────────
  const pair = Keypair.random();
  console.log('━'.repeat(60));
  console.log('🔑  New Stellar Keypair Generated');
  console.log('━'.repeat(60));
  console.log(`   Public Key:  ${pair.publicKey()}`);
  console.log(`   Secret Key:  ${pair.secret()}`);
  console.log();

  // ── 2. Fund via Friendbot ────────────────────────────
  console.log('💰  Requesting testnet funding from Friendbot...');
  const friendbotUrl = `${FRIENDBOT_URL}?addr=${encodeURIComponent(pair.publicKey())}`;

  const fundResponse = await fetch(friendbotUrl);
  if (!fundResponse.ok) {
    const errorBody = await fundResponse.text();
    throw new Error(`Friendbot funding failed (${fundResponse.status}): ${errorBody}`);
  }
  console.log('   ✅ Account funded on Stellar testnet!\n');

  // ── 3. Fetch account & print balance ─────────────────
  console.log('🌐  Fetching account from Horizon testnet...');
  const server = new Horizon.Server(HORIZON_URL);
  const account = await server.loadAccount(pair.publicKey());

  console.log('━'.repeat(60));
  console.log('📊  Account Balances');
  console.log('━'.repeat(60));
  for (const balance of account.balances) {
    if (balance.asset_type === 'native') {
      console.log(`   XLM:  ${balance.balance}`);
    } else {
      const b = balance as Horizon.HorizonApi.BalanceLineAsset;
      console.log(`   ${b.asset_code}:  ${b.balance}`);
    }
  }
  console.log();

  // ── 4. Summary ───────────────────────────────────────
  console.log('━'.repeat(60));
  console.log('✨  Summary');
  console.log('━'.repeat(60));
  console.log(`   Public Key:  ${pair.publicKey()}`);
  console.log(`   Secret Key:  ${pair.secret()}`);
  console.log(`   Network:     Stellar Testnet`);
  console.log(`   Horizon:     ${HORIZON_URL}`);
  console.log('━'.repeat(60));
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});

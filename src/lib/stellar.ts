import * as StellarSdk from '@stellar/stellar-sdk';
import crypto from 'crypto';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const NETWORK = StellarSdk.Networks.TESTNET;

export async function issueBatchAsset(batchId: string, farmerSecret: string) {
  const farmerKeypair = StellarSdk.Keypair.fromSecret(farmerSecret);
  const assetCode = `C${batchId.replace(/-/g, '').slice(0, 11).toUpperCase()}`;
  const asset = new StellarSdk.Asset(assetCode, farmerKeypair.publicKey());

  const account = await server.loadAccount(farmerKeypair.publicKey());
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: farmerKeypair.publicKey(),
      asset,
      amount: '0.0000001',
    }))
    .setTimeout(30)
    .build();

  tx.sign(farmerKeypair);
  const result = await server.submitTransaction(tx);
  return { assetCode, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}` };
}

export async function anchorBatchHash(batch: {
  id: string; cropType: string; quantity: number; harvestDate: Date;
  expiryDate: Date; region: string; farmerId: string;
}, farmerSecret: string) {
  const dataString = JSON.stringify({
    cropType: batch.cropType, quantity: batch.quantity,
    harvestDate: batch.harvestDate, expiryDate: batch.expiryDate,
    region: batch.region, farmerId: batch.farmerId,
  });
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');

  const farmerKeypair = StellarSdk.Keypair.fromSecret(farmerSecret);
  const account = await server.loadAccount(farmerKeypair.publicKey());
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.manageData({ name: `batch:${batch.id}`.slice(0, 64), value: hash }))
    .setTimeout(30)
    .build();

  tx.sign(farmerKeypair);
  await server.submitTransaction(tx);
  return hash;
}

export async function transferBatch(
  assetCode: string, issuerPublicKey: string,
  fromSecret: string, toPublicKey: string, toSecret: string,
) {
  const asset = new StellarSdk.Asset(assetCode, issuerPublicKey);
  const fromKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
  const toKeypair = StellarSdk.Keypair.fromSecret(toSecret);

  const toAccount = await server.loadAccount(toKeypair.publicKey());
  const trustTx = new StellarSdk.TransactionBuilder(toAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.changeTrust({ asset }))
    .setTimeout(30)
    .build();
  trustTx.sign(toKeypair);
  await server.submitTransaction(trustTx);

  const fromAccount = await server.loadAccount(fromKeypair.publicKey());
  const payTx = new StellarSdk.TransactionBuilder(fromAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({ destination: toPublicKey, asset, amount: '0.0000001' }))
    .setTimeout(30)
    .build();
  payTx.sign(fromKeypair);
  const result = await server.submitTransaction(payTx);
  return result.hash;
}
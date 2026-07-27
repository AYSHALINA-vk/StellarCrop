## StellarCrop

## Product Description
StellarCrop is a farm-to-table crop traceability marketplace built on Stellar. Every crop batch is tokenized as a Stellar asset, creating an immutable, verifiable chain of custody as it moves from farmer → wholesaler → retailer → consumer.

## Problem Statement
Farmers lose visibility and leverage the moment their crop leaves the farm. There's no verifiable way to prove where food came from, who handled it, or that it wasn't tampered with along the way — and no way for a buyer to trust a new farmer without an existing track record.

## How We're Solving It
StellarCrop anchors every batch's data as a cryptographic hash on Stellar and moves custody via real on-chain asset transfers — so the chain of custody is tamper-evident and independently verifiable, not just a claim in a database. A graduated-disclosure marketplace (crop data first, identity only after a deal is accepted) and a government-verified checkmark solve the cold-start trust problem for new farmers, without requiring a transaction history before anyone will buy from them.

## Product Features
- Tokenized batches — each crop batch is issued as a unique Stellar asset at creation
- Tamper-evident data anchoring— SHA-256 hash of batch data written on-chain via `manageData`
- Graduated-disclosure marketplace — wholesalers see crop data + a govt-verified checkmark, not farmer identity, until an offer is accepted
- Real on-chain custody transfers — accepting an offer triggers an actual Stellar payment operation, not a database flag
- Public QR trace page — consumers scan a code to see the full custody chain and verify the anchored hash, with no raw farm data exposed
- Trust ladder— govt-verified checkmark at onboarding → rating over time → badge/insurance at volume, to bootstrap trust for new farmers

## Architectural Diagram
> (Postgres layer ↔ Express/Prisma API ↔ Stellar testnet/mainnet ↔ Next.js frontend). 

`!(./docs/architecture.png)`

## Deployed Asset / Chain Details (Mainnet)
>
- Asset issuer (farmer) public key: GAGUVFLFKEHDCIGBJ463AZIBFFECDFFNKOCTRTUPC6M6G7I6OO3OCWH4
- asset_type: "native"
- Stellar Explorer link: `(https://stellar.expert/explorer/public/account/GAGUVFLFKEHDCIGBJ463AZIBFFECDFFNKOCTRTUPC6M6G7I6OO3OCWH4)`
-  ![Mainnet account on Stellar Explorer](./docs/mainnet-account.jpg)



## Product Demo
- Demo video: (https://drive.google.com/file/d/15AqqA8qkEyew6qTkn1J31lfGGzbpVrMd/view?usp=sharing)
- Live application: https://stellar-crop-iota.vercel.app/

  
## Setup Guide
### Prerequisites
- Node.js (version)
- Docker (for local Postgres)
- A Stellar account with XLM (testnet: use Friendbot; mainnet: manually funded)

### Backend
```bash
cd backend
npm install
docker compose up -d
npx prisma migrate dev --name init
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Future Vision
- Soroban smart contracts for automated expiry enforcement and non-transferable verification/badge credentials
- Custodial wallet security (currently plaintext keys — hackathon scope only)
- Full role-based auth and reservation-lock handling to prevent race conditions on offers
- NGO/government partnership integration for badge and insurance issuance
- Expansion beyond a single crop-to-consumer chain into multi-hop logistics (cold storage, transport verification)

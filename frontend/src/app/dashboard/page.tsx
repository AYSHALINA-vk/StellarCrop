"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, Batch, Transaction } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function currentHolderId(batch: Batch, txs: Transaction[]): string {
  const related = txs
    .filter((t) => t.batchId === batch.id)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  if (related.length === 0) return batch.farmerId;
  return related[related.length - 1].toUserId;
}

function ExplorerLink({ hash }: { hash?: string }) {
  if (!hash) return null;
  return (

    <a
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
      target="_blank"
      className="text-xs text-green-400 underline"
     >
      View on Stellar Expert
    </a>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [marketplace, setMarketplace] = useState<Batch[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: string; govtVerified?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  const [cropType, setCropType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [region, setRegion] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [b, t] = await Promise.all([api.getBatches(), api.getTransactions()]);
      setBatches(b);
      setTxs(t);
      if (user.role === "WHOLESALER") setMarketplace(await api.getMarketplaceBatches());
      if (user.role === "GOVT_ADMIN") setUsers(await api.getUsers());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    load();
  }, [user, router, load]);

  if (!user) return null;

  async function createBatch() {
    if (!user || !cropType || !quantity || !harvestDate || !expiryDate || !region) return;
    setLoading(true);
    try {
      await api.createBatch({
        farmerId: user.id,
        cropType,
        quantity: Number(quantity),
        harvestDate,
        expiryDate,
        region,
      });
      setCropType(""); setQuantity(""); setHarvestDate(""); setExpiryDate(""); setRegion("");
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to create batch");
    }
    setLoading(false);
  }

  async function claim(batch: Batch, fromUserId: string) {
    if (!user) return;
    setLoading(true);
    try {
      await api.createTransaction({ batchId: batch.id, fromUserId, toUserId: user.id });
      await load();
    } catch (e) {
      console.error(e);
      alert("Transfer failed");
    }
    setLoading(false);
  }

  async function verify(id: string) {
    setLoading(true);
    try {
      await api.verifyUser(id);
      await load();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">StellarCrop</h1>
          <p className="text-neutral-400 text-sm">
            {user.name} · <span className="text-green-400">{user.role}</span>
            {user.stellarPublicKey && (
              <span className="text-neutral-600"> · {user.stellarPublicKey.slice(0, 8)}...</span>
            )}
          </p>
        </div>
        <button onClick={() => { logout(); router.push("/"); }} className="text-sm text-neutral-400 hover:text-white">
          Switch user
        </button>
      </div>

      {loading && <p className="text-neutral-500 mb-4">Working...</p>}

      {/* FARMER */}
      {user.role === "FARMER" && (
        <>
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
            <h2 className="font-semibold mb-4">Create a new batch</h2>
            <div className="grid grid-cols-2 gap-3">
              <input className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5" placeholder="Crop type" value={cropType} onChange={(e) => setCropType(e.target.value)} />
              <input className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5" placeholder="Quantity (kg)" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <input className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5" type="date" placeholder="Harvest date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
              <input className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5" type="date" placeholder="Expiry date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              <input className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 col-span-2" placeholder="Region" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <button onClick={createBatch} className="mt-4 bg-green-700 hover:bg-green-600 rounded-lg px-5 py-2.5 font-medium">
              Tokenize batch
            </button>
          </section>

          <h2 className="font-semibold mb-3">Your batches</h2>
          <div className="space-y-3">
            {batches.filter((b) => b.farmerId === user.id).map((b) => (
              <div key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{b.cropType} · {b.quantity}kg · {b.region}</div>
                    <div className="text-xs text-neutral-500">Status: {b.status} · Asset: {b.stellarAssetCode || "pending"}</div>
                  </div>
                  <a href={`/trace/${b.id}`} target="_blank" className="text-xs text-green-400 underline self-center">
                    View trace page
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* WHOLESALER: marketplace + holdings */}
      {user.role === "WHOLESALER" && (
        <>
          <h2 className="font-semibold mb-3">Marketplace — crop listings from all farmers</h2>
          <div className="space-y-3 mb-8">
            {marketplace.map((b) => (
              <div key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {b.cropType} · {b.quantity}kg · {b.region}
                    {b.farmer?.govtVerified && <span className="ml-2 text-green-400 text-xs">✓ Govt-Verified</span>}
                  </div>
                  <div className="text-xs text-neutral-500">Harvest {b.harvestDate} · Expires {b.expiryDate}</div>
                </div>
                <button onClick={() => claim(b, b.farmerId)} className="bg-green-700 hover:bg-green-600 rounded-lg px-4 py-2 text-sm font-medium">
                  Claim batch
                </button>
              </div>
            ))}
            {marketplace.length === 0 && <p className="text-neutral-500 text-sm">No batches listed yet.</p>}
          </div>

          <h2 className="font-semibold mb-3">Your holdings</h2>
          <div className="space-y-3">
            {batches.filter((b) => b.status === "WITH_WHOLESALER" && currentHolderId(b, txs) === user.id).map((b) => (
              <div key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="font-medium">{b.cropType} · {b.quantity}kg</div>
                <ExplorerLink hash={txs.filter((t) => t.batchId === b.id).pop()?.stellarTxHash} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* RETAILER: buy from wholesalers + holdings */}
      {user.role === "RETAILER" && (
        <>
          <h2 className="font-semibold mb-3">Available from wholesalers</h2>
          <div className="space-y-3 mb-8">
            {batches.filter((b) => b.status === "WITH_WHOLESALER").map((b) => (
              <div key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{b.cropType} · {b.quantity}kg · {b.region}</div>
                  <div className="text-xs text-neutral-500">Expires {b.expiryDate}</div>
                </div>
                <button onClick={() => claim(b, currentHolderId(b, txs))} className="bg-green-700 hover:bg-green-600 rounded-lg px-4 py-2 text-sm font-medium">
                  Claim batch
                </button>
              </div>
            ))}
            {batches.filter((b) => b.status === "WITH_WHOLESALER").length === 0 && (
              <p className="text-neutral-500 text-sm">No batches available yet.</p>
            )}
          </div>

          <h2 className="font-semibold mb-3">Your holdings</h2>
          <div className="space-y-3">
            {batches.filter((b) => b.status === "WITH_RETAILER" && currentHolderId(b, txs) === user.id).map((b) => (
              <div key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="font-medium">{b.cropType} · {b.quantity}kg</div>
                <a href={`/trace/${b.id}`} target="_blank" className="text-xs text-green-400 underline">
                  View trace page (QR-ready)
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CONSUMER */}
      {user.role === "CONSUMER" && <ConsumerLookup />}

      {/* GOVT ADMIN */}
      {user.role === "GOVT_ADMIN" && (
        <>
          <h2 className="font-semibold mb-3">Verify farmers & businesses</h2>
          <div className="space-y-2">
            {users.filter((u) => u.role !== "CONSUMER" && u.role !== "GOVT_ADMIN").map((u) => (
              <div key={u.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex justify-between items-center">
                <span>{u.name} <span className="text-neutral-500 text-xs">({u.role})</span></span>
                {u.govtVerified ? (
                  <span className="text-green-400 text-sm">✓ Verified</span>
                ) : (
                  <button onClick={() => verify(u.id)} className="bg-green-700 hover:bg-green-600 rounded-lg px-4 py-1.5 text-sm">
                    Verify
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function ConsumerLookup() {
  const [id, setId] = useState("");
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h2 className="font-semibold mb-3">Trace a product</h2>
      <p className="text-neutral-400 text-sm mb-4">Enter a batch ID (or scan its QR code) to see the full farm-to-table chain.</p>
      <div className="flex gap-2">
        <input className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-2.5" placeholder="Batch ID" value={id} onChange={(e) => setId(e.target.value)} />
        <a href={id ? `/trace/${id}` : "#"} target="_blank" className="bg-green-700 hover:bg-green-600 rounded-lg px-5 py-2.5 font-medium">
          Trace
        </a>
      </div>
    </section>
  );
}
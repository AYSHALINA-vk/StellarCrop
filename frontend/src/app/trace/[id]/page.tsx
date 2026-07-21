"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Batch, Transaction } from "../../../lib/api";

export default function TracePage() {
  const params = useParams();
  const id = params.id as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const b = await api.getBatch(id);
        setBatch(b);
        const allTx = await api.getTransactions();
        setTxs(allTx.filter((t) => t.batchId === id));
      } catch (e) {
        setError("Batch not found");
      }
    })();
  }, [id]);

  const traceUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(traceUrl)}`;

  if (error) return <main className="max-w-2xl mx-auto px-6 py-16 text-center text-neutral-400">{error}</main>;
  if (!batch) return <main className="max-w-2xl mx-auto px-6 py-16 text-center text-neutral-500">Loading...</main>;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-1">🌾 {batch.cropType}</h1>
      <p className="text-neutral-400 mb-8">{batch.quantity}kg · Harvested {batch.harvestDate} · Region: {batch.region}</p>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6 flex items-center gap-6">
        <img src={qrSrc} alt="QR code" className="rounded-lg bg-white p-2" />
        <div>
          <div className="text-green-400 font-medium mb-1">✓ Verified on Stellar</div>
          <div className="text-xs text-neutral-500 break-all">Hash: {batch.dataHash}</div>
          <div className="text-xs text-neutral-500 break-all mt-1">Asset: {batch.stellarAssetCode}</div>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Chain of custody</h2>
      <div className="space-y-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-sm font-medium">Farm origin</div>
          <div className="text-xs text-neutral-500">Batch tokenized · Expiry {batch.expiryDate}</div>
        </div>
        {txs.map((t) => (
          <div key={t.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <div className="text-sm font-medium">Custody transferred</div>
            {t.stellarTxHash && (
              <a href={`https://stellar.expert/explorer/testnet/tx/${t.stellarTxHash}`} target="_blank" className="text-xs text-green-400 underline">
                View transaction on Stellar Expert
              </a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
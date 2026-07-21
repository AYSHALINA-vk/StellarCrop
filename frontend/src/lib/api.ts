const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export type Role = "FARMER" | "WHOLESALER" | "RETAILER" | "CONSUMER" | "GOVT_ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  stellarPublicKey?: string;
  govtVerified?: boolean;
}

export interface Batch {
  id: string;
  farmerId: string;
  farmer?: { id?: string; name?: string; govtVerified?: boolean };
  cropType: string;
  quantity: number;
  harvestDate: string;
  expiryDate: string;
  region: string;
  status: string;
  stellarAssetCode?: string;
  dataHash?: string;
}

export interface Transaction {
  id: string;
  batchId: string;
  fromUserId: string;
  toUserId: string;
  stellarTxHash?: string;
  status: string;
  createdAt?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => request<{ status: string }>("/health"),
  getUsers: () => request<User[]>("/users"),
  createUser: (data: { name: string; email: string; role: Role }) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  verifyUser: (id: string) => request<User>(`/users/${id}/verify`, { method: "PATCH" }),
  getBatches: () => request<Batch[]>("/batches"),
  getBatch: (id: string) => request<Batch>(`/batches/${id}`),
  getMarketplaceBatches: () => request<Batch[]>("/batches/marketplace"),
  createBatch: (data: {
    farmerId: string;
    cropType: string;
    quantity: number;
    harvestDate: string;
    expiryDate: string;
    region: string;
  }) => request<Batch>("/batches", { method: "POST", body: JSON.stringify(data) }),
  getTransactions: () => request<Transaction[]>("/transactions"),
  createTransaction: (data: { batchId: string; fromUserId: string; toUserId: string }) =>
    request<Transaction>("/transactions", { method: "POST", body: JSON.stringify(data) }),
};
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Role, User } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const ROLES: { role: Role; label: string; emoji: string }[] = [
  { role: "FARMER", label: "Farmer", emoji: "🌾" },
  { role: "WHOLESALER", label: "Wholesaler", emoji: "📦" },
  { role: "RETAILER", label: "Retailer", emoji: "🏪" },
  { role: "CONSUMER", label: "Consumer", emoji: "🛒" },
  { role: "GOVT_ADMIN", label: "Govt Admin", emoji: "🏛️" },
];

export default function Home() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  async function pickRole(role: Role) {
    setSelectedRole(role);
    setLoading(true);
    try {
      const all = await api.getUsers();
      setUsers(all.filter((u) => u.role === role));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function selectUser(u: User) {
    setUser(u);
    router.push("/dashboard");
  }

  async function createUser() {
    if (!selectedRole || !newName || !newEmail) return;
    setLoading(true);
    try {
      const u = await api.createUser({ name: newName, email: newEmail, role: selectedRole });
      setUser(u);
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      alert("Failed to create user — is the backend running on port 3000?");
    }
    setLoading(false);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2">StellarCrop</h1>
      <p className="text-neutral-400 mb-10">Pick a role to enter the demo</p>

      {!selectedRole && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {ROLES.map((r) => (
            <button
              key={r.role}
              onClick={() => pickRole(r.role)}
              className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl p-6 text-left transition"
            >
              <div className="text-3xl mb-2">{r.emoji}</div>
              <div className="font-semibold">{r.label}</div>
            </button>
          ))}
        </div>
      )}

      {selectedRole && (
        <div>
          <button onClick={() => setSelectedRole(null)} className="text-sm text-neutral-400 mb-6">
            ← back
          </button>
          <h2 className="text-xl font-semibold mb-4">{selectedRole}</h2>

          {loading && <p className="text-neutral-500">Loading...</p>}

          <div className="space-y-2 mb-8">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className="w-full text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg p-4 flex justify-between items-center"
              >
                <span>
                  {u.name} <span className="text-neutral-500 text-sm">({u.email})</span>
                </span>
                {u.govtVerified && <span className="text-green-400 text-sm">✓ Verified</span>}
              </button>
            ))}
            {users.length === 0 && !loading && (
              <p className="text-neutral-500 text-sm">No existing users for this role yet.</p>
            )}
          </div>

          <div className="border-t border-neutral-800 pt-6">
            <h3 className="font-medium mb-3">Create new {selectedRole.toLowerCase()}</h3>
            <input
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-2"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-3"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <button
              onClick={createUser}
              disabled={loading}
              className="bg-green-700 hover:bg-green-600 rounded-lg px-5 py-2.5 font-medium disabled:opacity-50"
            >
              Create & Continue (funds a Stellar wallet)
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
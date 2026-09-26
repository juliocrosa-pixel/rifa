"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RaffleNumber = {
  id: number;
  status: string;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  paymentId: string | null;
  reservedAt: string | null;
  soldAt: string | null;
};

type Summary = { total: number; sold: number; reserved: number; available: number };

export default function AdminDashboard() {
  const router = useRouter();
  const [numbers, setNumbers] = useState<RaffleNumber[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<"all" | "available" | "reserved" | "sold">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/numbers");
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setNumbers(data.numbers);
    setSummary(data.summary);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function markAs(id: number, status: "available" | "sold") {
    await fetch("/api/admin/numbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const filtered = useMemo(() => {
    return numbers.filter((n) => {
      if (filter !== "all" && n.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesId = String(n.id).includes(q);
        const matchesName = (n.buyerName || "").toLowerCase().includes(q);
        const matchesPhone = (n.buyerPhone || "").toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [numbers, filter, search]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Painel da Rifa</h1>
        <div className="flex gap-2">
          <a
            href="/api/admin/export"
            className="text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg"
          >
            Exportar CSV
          </a>
          <button
            onClick={handleLogout}
            className="text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-2 rounded-lg"
          >
            Sair
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Vendidos" value={summary.sold} color="text-red-400" />
          <SummaryCard label="Reservados" value={summary.reserved} color="text-yellow-400" />
          <SummaryCard label="Disponíveis" value={summary.available} color="text-green-400" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "available", "reserved", "sold"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              filter === f
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-neutral-800 border-neutral-700 text-neutral-300"
            }`}
          >
            {f === "all" ? "Todos" : f === "available" ? "Disponíveis" : f === "reserved" ? "Reservados" : "Vendidos"}
          </button>
        ))}
        <input
          placeholder="Buscar por número, nome ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto text-sm bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 w-64"
        />
      </div>

      {loading ? (
        <p className="text-neutral-400 text-sm">Carregando...</p>
      ) : (
        <div className="overflow-x-auto border border-neutral-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="text-left p-2">Número</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Comprador</th>
                <th className="text-left p-2">WhatsApp</th>
                <th className="text-left p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} className="border-t border-neutral-800">
                  <td className="p-2 font-mono">{n.id}</td>
                  <td className="p-2">
                    <StatusBadge status={n.status} />
                  </td>
                  <td className="p-2">{n.buyerName || "-"}</td>
                  <td className="p-2">{n.buyerPhone || "-"}</td>
                  <td className="p-2 flex gap-2">
                    {n.status !== "sold" && (
                      <button
                        onClick={() => markAs(n.id, "sold")}
                        className="text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-800 px-2 py-1 rounded"
                      >
                        Marcar vendido
                      </button>
                    )}
                    {n.status !== "available" && (
                      <button
                        onClick={() => markAs(n.id, "available")}
                        className="text-xs bg-green-900/40 hover:bg-green-900/70 border border-green-800 px-2 py-1 rounded"
                      >
                        Liberar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: "bg-green-900/40 text-green-300 border-green-800",
    reserved: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
    sold: "bg-red-900/40 text-red-300 border-red-800",
  };
  const label: Record<string, string> = {
    available: "Disponível",
    reserved: "Reservado",
    sold: "Vendido",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${map[status] || ""}`}>
      {label[status] || status}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatDateTime, maskPhoneInput, padNumber } from "@/lib/format";

type Group = {
  raffleId: number;
  title: string;
  totalNumbers: number;
  status: string;
  drawDate: string | null;
  winnerNumber: number | null;
  numbers: number[];
};

export default function MyNumbersClient() {
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Group[] | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("rifa_comprador") || "{}");
      if (saved.phone) setContact(saved.phone);
    } catch {}
  }, []);

  function handleChange(v: string) {
    // Se parece telefone, aplica a máscara; se tem letra ou @, deixa como e-mail.
    if (/[a-zA-Z@]/.test(v)) setContact(v);
    else setContact(maskPhoneInput(v));
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/meus-numeros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Erro na busca.");
      else setResult(data.raffles || []);
    } catch {
      setError("Erro de conexão.");
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Meus números</h1>
      <p className="mt-2 text-neutral-400">
        Digite o WhatsApp (ou e-mail) que você usou na compra para ver todos os seus números pagos.
      </p>

      <form onSubmit={search} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          required
          value={contact}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="(41) 99999-9999 ou seu@email.com"
          className="flex-1 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 outline-none focus:border-amber-400"
        />
        <button
          disabled={loading}
          className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-neutral-950 hover:bg-amber-300 disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Consultar"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && result.length === 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 p-6 text-center text-neutral-400">
          Nenhum número pago encontrado com esse contato.
          <p className="mt-1 text-xs">
            Confira se digitou igual à compra. Pagamentos podem levar alguns segundos para confirmar.
          </p>
        </div>
      )}

      {result && result.length > 0 && (
        <div className="mt-8 space-y-4">
          {result.map((g) => {
            const won = g.winnerNumber !== null && g.numbers.includes(g.winnerNumber);
            return (
              <div
                key={g.raffleId}
                className={`rounded-2xl border p-5 ${won ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-neutral-900/60"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{g.title}</h2>
                  <StatusPill status={g.status} />
                </div>
                {g.drawDate && g.status !== "finished" && (
                  <p className="mt-1 text-sm text-neutral-400">📅 Sorteio: {formatDateTime(g.drawDate)}</p>
                )}
                {g.status === "finished" && g.winnerNumber !== null && (
                  <p className="mt-1 text-sm text-neutral-300">
                    {won ? "🏆 VOCÊ GANHOU! " : ""}Número sorteado:{" "}
                    <b className="font-mono text-amber-300">{padNumber(g.winnerNumber, g.totalNumbers)}</b>
                  </p>
                )}
                <p className="mt-3 text-sm text-neutral-400">{g.numbers.length} número(s):</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.numbers.map((n) => (
                    <span
                      key={n}
                      className={`rounded-lg px-2.5 py-1 font-mono text-sm font-bold ${
                        n === g.winnerNumber ? "bg-amber-400 text-neutral-950" : "bg-white/10 text-white"
                      }`}
                    >
                      {padNumber(n, g.totalNumbers)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "finished")
    return <span className="rounded-full bg-neutral-700 px-2.5 py-0.5 text-xs">Sorteada</span>;
  if (status === "active")
    return <span className="rounded-full bg-emerald-600/30 px-2.5 py-0.5 text-xs text-emerald-300">Em andamento</span>;
  return <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-400">Pausada</span>;
}

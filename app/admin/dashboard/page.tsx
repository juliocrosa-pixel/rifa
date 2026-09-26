"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminTopBar, Card, StatusBadge, inputCls } from "@/components/admin/ui";
import { formatBRL, formatDateTime } from "@/lib/format";

type RaffleRow = {
  id: number;
  title: string;
  prize: string;
  status: string;
  priceCents: number;
  totalNumbers: number;
  drawDate: string | null;
  winnerNumber: number | null;
  winnerName: string | null;
  sold: number;
  reserved: number;
  revenueCents: number;
};

type Settings = { siteName: string; whatsapp: string; instagram: string };

export default function AdminDashboard() {
  const router = useRouter();
  const [raffles, setRaffles] = useState<RaffleRow[] | null>(null);
  const [settings, setSettings] = useState<Settings>({ siteName: "", whatsapp: "", instagram: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/raffles", { cache: "no-store" });
    if (res.status === 401) return router.push("/admin/login");
    if (!res.ok) {
      setLoadError(
        "Não consegui carregar as rifas. Se você acabou de atualizar o site, abra /api/setup?secret=SEU_SETUP_SECRET uma vez."
      );
      setRaffles([]);
      return;
    }
    const data = await res.json();
    setRaffles(data.raffles);
    const s = await fetch("/api/admin/settings", { cache: "no-store" });
    if (s.ok) setSettings((await s.json()).settings);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    setSavingSettings(false);
    setSettingsMsg(res.ok ? "Salvo ✓" : data.error || "Erro ao salvar");
    setTimeout(() => setSettingsMsg(""), 3000);
  }

  const active = raffles?.find((r) => r.status === "active");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminTopBar title="Painel das Rifas" />

      {loadError && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{loadError}</p>}

      {active && (
        <Card className="mb-6 border-emerald-700/50">
          <p className="text-sm text-emerald-300">Rifa à venda agora</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xl font-bold">{active.title}</p>
            <Link
              href={`/admin/rifas/${active.id}`}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-amber-300"
            >
              Gerenciar
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Vendidos" value={`${active.sold} / ${active.totalNumbers}`} />
            <Stat label="Arrecadado" value={formatBRL(active.revenueCents)} />
            <Stat label="Aguardando PIX" value={String(active.reserved)} />
            <Stat label="Sorteio" value={active.drawDate ? formatDateTime(active.drawDate) : "—"} />
          </div>
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Todas as rifas</h2>
        <Link
          href="/admin/rifas/nova"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
        >
          + Nova rifa
        </Link>
      </div>

      {raffles === null ? (
        <p className="text-sm text-neutral-400">Carregando...</p>
      ) : raffles.length === 0 ? (
        <Card className="text-center text-neutral-400">
          Nenhuma rifa ainda. Clique em <b>+ Nova rifa</b> para criar a primeira.
        </Card>
      ) : (
        <div className="space-y-2">
          {raffles.map((r) => (
            <Link
              key={r.id}
              href={`/admin/rifas/${r.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-900/60 p-4 hover:border-amber-400/50"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.title}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  {r.sold}/{r.totalNumbers} vendidos · {formatBRL(r.revenueCents)} arrecadado · {formatBRL(r.priceCents)}/número
                </p>
                {r.status === "finished" && r.winnerNumber !== null && (
                  <p className="text-sm text-amber-300">
                    🏆 Nº {r.winnerNumber} — {r.winnerName || "não vendido"}
                  </p>
                )}
              </div>
              <span className="text-neutral-500">›</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold">Configurações do site</h2>
      <Card>
        <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Nome do site</label>
            <input
              required
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className={inputCls}
              placeholder="Ex: Rifas do Julio"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">WhatsApp de contato</label>
            <input
              value={settings.whatsapp}
              onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
              className={inputCls}
              placeholder="41999999999"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Instagram (opcional)</label>
            <input
              value={settings.instagram}
              onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
              className={inputCls}
              placeholder="seuinstagram"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-3">
            <button
              disabled={savingSettings}
              className="rounded-lg bg-amber-400 px-5 py-2 font-bold text-neutral-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </button>
            {settingsMsg && <span className="text-sm text-neutral-300">{settingsMsg}</span>}
          </div>
        </form>
      </Card>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 p-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 font-bold">{value}</p>
    </div>
  );
}

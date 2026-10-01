"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BuyModal from "./BuyModal";
import ImageCarousel from "./ImageCarousel";
import DrawCountdown from "./DrawCountdown";
import { formatBRL, formatDateTime, padNumber } from "@/lib/format";
import type { PublicRaffle } from "@/lib/raffles";

type Filter = "all" | "available";

export default function RaffleClient({
  raffle,
  images,
  initialStatus,
  reserveMinutes,
}: {
  raffle: PublicRaffle;
  images: string[];
  initialStatus: string;
  reserveMinutes: number;
}) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [selected, setSelected] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [showRules, setShowRules] = useState(false);
  const modalOpenRef = useRef(false);
  modalOpenRef.current = modalOpen;
  const gridRef = useRef<HTMLDivElement | null>(null);

  const total = raffle.totalNumbers;
  const soldCount = useMemo(() => status.split("").filter((c) => c === "s").length, [status]);
  const availableCount = useMemo(() => status.split("").filter((c) => c === "a").length, [status]);
  const percent = total > 0 ? Math.round((soldCount / total) * 1000) / 10 : 0;
  const totalCents = selected.length * raffle.priceCents;

  async function refresh() {
    try {
      const res = await fetch(`/api/numbers?raffle=${raffle.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.status !== "string") return;
      setStatus(data.status);
      if (!modalOpenRef.current) {
        setSelected((prev) => prev.filter((n) => data.status.charAt(n - 1) === "a"));
      }
    } catch {
      // ignora falhas pontuais de rede
    }
  }

  // Atualiza a grade sozinha a cada 15 segundos e quando a pessoa volta pra aba.
  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffle.id]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  }

  function toggle(n: number) {
    if (status.charAt(n - 1) !== "a") return;
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  function pickRandom(qty: number) {
    const pool: number[] = [];
    for (let i = 0; i < status.length; i++) {
      const n = i + 1;
      if (status.charAt(i) === "a" && !selected.includes(n)) pool.push(n);
    }
    if (pool.length === 0) return flash("Não há mais números disponíveis.");
    const picked: number[] = [];
    while (picked.length < qty && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    setSelected((prev) => [...prev, ...picked]);
    flash(`${picked.length} número(s) da sorte adicionados! 🍀`);
  }

  const visible = useMemo(() => {
    const q = search.replace(/\D/g, "");
    const list: number[] = [];
    for (let n = 1; n <= total; n++) {
      const st = status.charAt(n - 1) || "a";
      if (filter === "available" && st !== "a") continue;
      if (q && !padNumber(n, total).includes(q) && !String(n).includes(q)) continue;
      list.push(n);
    }
    return list;
  }, [status, filter, search, total]);

  function handleSuccess(ids: number[]) {
    setStatus((prev) => {
      const arr = prev.split("");
      ids.forEach((n) => (arr[n - 1] = "s"));
      return arr.join("");
    });
    setSelected([]);
  }

  function handleConflict() {
    setModalOpen(false);
    refresh();
    flash("Um dos números acabou de ser pego. Atualizamos a lista pra você.");
  }

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="pb-40">
      {/* ===== TOPO / PRÊMIO ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-5xl gap-6 px-4 pb-8 pt-6 md:grid-cols-2 md:gap-10 md:pt-10">
          <ImageCarousel images={images} alt={raffle.prize || raffle.title} />

          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              ● Vendas abertas
            </span>
            <div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{raffle.title}</h1>
              {raffle.prize && (
                <p className="mt-2 text-lg text-amber-300">
                  🏆 Prêmio: <span className="font-semibold">{raffle.prize}</span>
                </p>
              )}
            </div>

            {raffle.description && (
              <p className="whitespace-pre-line text-neutral-300">{raffle.description}</p>
            )}

            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white">{formatBRL(raffle.priceCents)}</span>
              <span className="pb-1 text-neutral-400">por número</span>
            </div>

            {/* Progresso */}
            <div>
              <div className="mb-1.5 flex justify-end text-sm">
                <span className="font-semibold text-amber-300">{percent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(percent, soldCount > 0 ? 2 : 0))}%` }}
                />
              </div>
              {availableCount > 0 && availableCount <= Math.max(10, total * 0.1) && (
                <p className="mt-1.5 text-sm font-medium text-orange-400">
                  🔥 Restam só {availableCount} números!
                </p>
              )}
            </div>

            {raffle.drawDate && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-neutral-400">
                  📅 Sorteio em <b className="text-white">{formatDateTime(raffle.drawDate)}</b>
                </p>
                {raffle.drawMethod && (
                  <p className="mt-1 text-sm text-neutral-400">🎲 {raffle.drawMethod}</p>
                )}
                <div className="mt-3">
                  <DrawCountdown drawDate={raffle.drawDate} />
                </div>
              </div>
            )}
            {!raffle.drawDate && raffle.drawMethod && (
              <p className="text-sm text-neutral-400">🎲 {raffle.drawMethod}</p>
            )}

            <button
              onClick={scrollToGrid}
              className="mt-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3.5 text-lg font-bold text-neutral-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110"
            >
              Escolher meus números
            </button>
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: "🔢", title: "1. Escolha", text: "Toque nos números que quiser ou use a escolha aleatória." },
            { icon: "📱", title: "2. Pague no PIX", text: `Você tem ${reserveMinutes} minutos pra pagar com QR code ou copia e cola.` },
            { icon: "✅", title: "3. Pronto!", text: "Confirmação na hora. Consulte seus números quando quiser." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-white/5 bg-neutral-900/60 p-4">
              <p className="text-2xl">{s.icon}</p>
              <p className="mt-2 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-neutral-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== NÚMEROS ===== */}
      <section ref={gridRef} className="mx-auto max-w-5xl scroll-mt-20 px-4 pt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Escolha seus números</h2>
            <p className="text-sm text-neutral-400">{availableCount} disponíveis de {total}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 5, 10].map((q) => (
              <button
                key={q}
                onClick={() => pickRandom(q)}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
              >
                🎲 +{q} aleatório{q > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 p-0.5 text-sm">
            {(["all", "available"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 ${filter === f ? "bg-white/10 font-semibold text-white" : "text-neutral-400"}`}
              >
                {f === "all" ? "Todos" : "Só disponíveis"}
              </button>
            ))}
          </div>
          <input
            inputMode="numeric"
            placeholder="🔍 Buscar número"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <div className="ml-auto flex flex-wrap gap-3 text-xs text-neutral-400">
            <Legend className="border-neutral-600 bg-neutral-800" label="Disponível" />
            <Legend className="border-amber-400 bg-amber-400" label="Selecionado" />
            <Legend className="border-yellow-700 bg-yellow-900/60" label="Reservado" />
            <Legend className="border-neutral-800 bg-neutral-900" label="Vendido" />
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-10 text-center text-neutral-500">Nenhum número encontrado.</p>
        ) : (
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
            {visible.map((n) => {
              const st = status.charAt(n - 1) || "a";
              const isSel = selected.includes(n);
              let cls =
                "border-neutral-700 bg-neutral-800 text-neutral-100 hover:border-amber-400 hover:bg-neutral-700 active:scale-95";
              if (isSel) cls = "border-amber-300 bg-amber-400 text-neutral-950 font-bold shadow-md shadow-amber-500/30 scale-[1.03]";
              else if (st === "r") cls = "border-yellow-800/60 bg-yellow-900/40 text-yellow-500/80 cursor-not-allowed";
              else if (st === "s") cls = "border-neutral-900 bg-neutral-900 text-neutral-600 line-through cursor-not-allowed";
              return (
                <button
                  key={n}
                  onClick={() => toggle(n)}
                  disabled={st !== "a"}
                  title={st === "s" ? "Vendido" : st === "r" ? "Reservado (aguardando pagamento)" : "Disponível"}
                  className={`flex h-11 items-center justify-center rounded-lg border font-mono text-sm transition ${cls}`}
                >
                  {padNumber(n, total)}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== REGULAMENTO ===== */}
      {raffle.rules && (
        <section className="mx-auto max-w-5xl px-4 pt-10">
          <button
            onClick={() => setShowRules((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-neutral-900/60 px-4 py-3 text-left font-semibold"
          >
            📜 Regulamento
            <span className="text-neutral-400">{showRules ? "−" : "+"}</span>
          </button>
          {showRules && (
            <div className="whitespace-pre-line rounded-b-xl border border-t-0 border-white/10 px-4 py-4 text-sm text-neutral-300">
              {raffle.rules}
            </div>
          )}
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 pt-6 text-center text-sm text-neutral-400">
        Já comprou? <Link href="/meus-numeros" className="font-semibold text-amber-300 hover:underline">Consulte seus números aqui</Link>
      </section>

      {/* ===== AVISO FLUTUANTE ===== */}
      {notice && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-neutral-800 px-4 py-2 text-sm shadow-lg ring-1 ring-white/10">
          {notice}
        </div>
      )}

      {/* ===== BARRA DE COMPRA ===== */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-neutral-950/95 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="mb-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto">
              {[...selected].sort((a, b) => a - b).map((n) => (
                <button
                  key={n}
                  onClick={() => toggle(n)}
                  className="rounded-md bg-amber-400/15 px-2 py-0.5 font-mono text-xs text-amber-300 hover:bg-amber-400/25"
                  title="Remover"
                >
                  {padNumber(n, total)} ✕
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-400">
                  {selected.length} número{selected.length > 1 ? "s" : ""}
                  <button onClick={() => setSelected([])} className="ml-2 text-xs underline hover:text-white">
                    limpar
                  </button>
                </p>
                <p className="text-xl font-bold">{formatBRL(totalCents)}</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 hover:brightness-110"
              >
                Comprar agora
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <BuyModal
          raffleId={raffle.id}
          raffleTitle={raffle.title}
          drawDate={raffle.drawDate}
          totalNumbers={total}
          selectedNumbers={[...selected].sort((a, b) => a - b)}
          totalCents={totalCents}
          reserveMinutes={reserveMinutes}
          onClose={() => {
            setModalOpen(false);
            refresh();
          }}
          onSuccess={handleSuccess}
          onConflict={handleConflict}
        />
      )}
    </main>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

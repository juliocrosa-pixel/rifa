"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BuyModal from "./BuyModal";

type RaffleNumber = { id: number; status: string };

export default function RaffleClient({
  initialNumbers,
  price,
  title,
  totalNumbers,
  reserveMinutes,
}: {
  initialNumbers: RaffleNumber[];
  price: number;
  title: string;
  totalNumbers: number;
  reserveMinutes: number;
}) {
  const [numbers, setNumbers] = useState<RaffleNumber[]>(initialNumbers);
  const [selected, setSelected] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const modalOpenRef = useRef(false);
  modalOpenRef.current = modalOpen;

  // Atualiza a grade sozinha a cada 15 segundos (e quando a pessoa volta pra aba),
  // pra mostrar números que foram vendidos ou liberados por outras pessoas.
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/numbers", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.numbers)) return;
        const fresh: RaffleNumber[] = data.numbers;
        setNumbers(fresh);
        // Se algum número selecionado foi pego por outra pessoa, tira da seleção
        // (menos enquanto a pessoa está no meio da compra).
        if (!modalOpenRef.current) {
          const availableIds = new Set(
            fresh.filter((n) => n.status === "available").map((n) => n.id)
          );
          setSelected((prev) => prev.filter((id) => availableIds.has(id)));
        }
      } catch {
        // ignora falhas pontuais de rede
      }
    }

    const interval = setInterval(refresh, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const total = useMemo(() => selected.length * price, [selected, price]);

  function toggleNumber(id: number, status: string) {
    if (status !== "available") return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  }

  function handleSuccess(soldIds: number[]) {
    setNumbers((prev) =>
      prev.map((n) => (soldIds.includes(n.id) ? { ...n, status: "sold" } : n))
    );
    setSelected([]);
    setModalOpen(false);
  }

  function handleExpiredOrCancelled(numberIds: number[]) {
    setNumbers((prev) =>
      prev.map((n) => (numberIds.includes(n.id) ? { ...n, status: "available" } : n))
    );
  }

  function statusClasses(status: string, isSelected: boolean) {
    if (isSelected) return "bg-blue-500 text-white border-blue-400";
    if (status === "sold") return "bg-red-900/60 text-red-300 border-red-800 cursor-not-allowed";
    if (status === "reserved")
      return "bg-yellow-900/50 text-yellow-300 border-yellow-700 cursor-not-allowed";
    return "bg-neutral-800 text-neutral-200 border-neutral-700 hover:border-blue-400 cursor-pointer";
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-neutral-400 mt-1">
          {totalNumbers} números · R$ {price.toFixed(2)} cada
        </p>
      </header>

      <div className="flex gap-4 justify-center text-xs mb-4 text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-neutral-800 border border-neutral-700 inline-block" />
          Disponível
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-900/50 border border-yellow-700 inline-block" />
          Reservado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-900/60 border border-red-800 inline-block" />
          Vendido
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
          Selecionado
        </span>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {numbers.map((n) => (
          <button
            key={n.id}
            onClick={() => toggleNumber(n.id, n.status)}
            disabled={n.status !== "available"}
            className={`aspect-square rounded border text-xs font-mono flex items-center justify-center transition-colors ${statusClasses(
              n.status,
              selected.includes(n.id)
            )}`}
          >
            {String(n.id).padStart(String(totalNumbers).length, "0")}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-medium">{selected.length} número(s) selecionado(s)</p>
              <p className="text-neutral-400">Total: R$ {total.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              Comprar
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <BuyModal
          selectedNumbers={selected}
          total={total}
          reserveMinutes={reserveMinutes}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
          onExpiredOrCancelled={handleExpiredOrCancelled}
        />
      )}
    </main>
  );
}

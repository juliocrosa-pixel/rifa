"use client";

import { useEffect, useState } from "react";

// Mostra "faltam 3d 04h 12m 09s" até a data do sorteio.
export default function DrawCountdown({ drawDate }: { drawDate: string }) {
  const target = new Date(drawDate).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return null;
  const diff = Math.max(0, Math.floor((target - now) / 1000));
  if (diff === 0) {
    return <p className="text-sm font-medium text-amber-300">O sorteio já vai acontecer!</p>;
  }

  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const parts = [
    { v: d, l: "dias" },
    { v: h, l: "horas" },
    { v: m, l: "min" },
    { v: s, l: "seg" },
  ];

  return (
    <div className="flex gap-2">
      {parts.map((p) => (
        <div key={p.l} className="min-w-[56px] rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center">
          <p className="font-mono text-lg font-bold tabular-nums">{String(p.v).padStart(2, "0")}</p>
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">{p.l}</p>
        </div>
      ))}
    </div>
  );
}

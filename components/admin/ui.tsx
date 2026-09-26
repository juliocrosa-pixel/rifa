"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export const inputCls =
  "w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 outline-none focus:border-amber-400";

export function AdminTopBar({ title, back }: { title: string; back?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {back && (
          <Link href={back} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5">
            ← Voltar
          </Link>
        )}
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex gap-2">
        <a href="/" target="_blank" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5">
          Ver site ↗
        </a>
        <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5">
          Sair
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active: ["À venda", "bg-emerald-600/20 text-emerald-300 border-emerald-700"],
    draft: ["Pausada / rascunho", "bg-neutral-800 text-neutral-300 border-neutral-700"],
    finished: ["Sorteada", "bg-amber-500/15 text-amber-300 border-amber-700"],
  };
  const [label, cls] = map[status] || [status, "bg-neutral-800 border-neutral-700"];
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs ${cls}`}>{label}</span>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-neutral-900/60 p-5 ${className}`}>{children}</div>;
}

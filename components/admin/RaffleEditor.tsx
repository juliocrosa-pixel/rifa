"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTopBar, Card, StatusBadge, inputCls } from "@/components/admin/ui";
import { formatBRL, formatDateTime, formatPhone, maskPhoneInput, padNumber, whatsappLink } from "@/lib/format";

type Raffle = {
  id: number;
  title: string;
  prize: string;
  description: string;
  rules: string;
  priceCents: number;
  totalNumbers: number;
  drawDate: string | null;
  drawMethod: string;
  status: string;
  winnerNumber: number | null;
  winnerName: string | null;
  finishedAt: string | null;
};

type Ticket = {
  number: number;
  status: string;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  soldAt: string | null;
  purchaseId: string | null;
};

type Conflict = {
  id: string;
  buyerName: string;
  buyerPhone: string;
  numbers: number[];
  amountCents: number;
  paidAt: string | null;
};

type Form = {
  title: string;
  prize: string;
  description: string;
  rules: string;
  price: string;
  totalNumbers: string;
  drawDate: string;
  drawMethod: string;
};

const DEFAULT_RULES = `1. Cada número custa o valor indicado na página e só é confirmado após o pagamento do PIX.
2. Os números reservados e não pagos no prazo voltam a ficar disponíveis automaticamente.
3. O sorteio será realizado na data informada, pelo método descrito na página.
4. O ganhador será avisado pelo WhatsApp informado na compra.
5. O prêmio deve ser retirado/entregue em até 30 dias após o sorteio.`;

// "2026-10-20T20:00:00.000Z" -> "2026-10-20T17:00" (hora local, pro campo datetime-local)
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toForm(r: Raffle | null): Form {
  if (!r) {
    return {
      title: "",
      prize: "",
      description: "",
      rules: DEFAULT_RULES,
      price: "10,00",
      totalNumbers: "1000",
      drawDate: "",
      drawMethod: "Pela Loteria Federal (último número do 1º prêmio)",
    };
  }
  return {
    title: r.title,
    prize: r.prize,
    description: r.description,
    rules: r.rules,
    price: (r.priceCents / 100).toFixed(2).replace(".", ","),
    totalNumbers: String(r.totalNumbers),
    drawDate: isoToLocalInput(r.drawDate),
    drawMethod: r.drawMethod,
  };
}

// Reduz a foto no navegador antes de enviar (máx. 1600px, JPEG) — fica leve pro site.
function resizeImage(file: File, maxSize = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não consegui ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagem não suportado."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Erro ao processar imagem."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function RaffleEditor({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "nova";

  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [form, setForm] = useState<Form>(toForm(null));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [winnerInput, setWinnerInput] = useState("");

  const [filter, setFilter] = useState<"all" | "sold" | "reserved" | "available">("sold");
  const [search, setSearch] = useState("");
  const [sellFor, setSellFor] = useState<number | null>(null);
  const [sellName, setSellName] = useState("");
  const [sellPhone, setSellPhone] = useState("");

  async function load() {
    if (isNew) return;
    const res = await fetch(`/api/admin/raffles/${id}`, { cache: "no-store" });
    if (res.status === 401) return router.push("/admin/login");
    if (!res.ok) {
      setMsg({ type: "err", text: "Rifa não encontrada." });
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRaffle(data.raffle);
    setImages(data.images);
    setTickets(data.tickets);
    setConflicts(data.conflicts || []);
    setForm(toForm(data.raffle));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function show(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    if (type === "ok") setTimeout(() => setMsg(null), 3500);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const payload = {
      ...form,
      drawDate: form.drawDate ? new Date(form.drawDate).toISOString() : null,
    };
    const res = await fetch(isNew ? "/api/admin/raffles" : `/api/admin/raffles/${id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return show("err", data.error || "Erro ao salvar.");
    if (isNew) {
      router.push(`/admin/rifas/${data.id}`);
      return;
    }
    show("ok", "Alterações salvas ✓");
    load();
  }

  async function setActive(active: boolean) {
    if (active && !confirm("Colocar esta rifa à venda? Se outra estiver à venda, ela será pausada.")) return;
    const res = await fetch(`/api/admin/raffles/${id}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return show("err", data.error || "Erro.");
    show("ok", active ? "Rifa à venda no site ✓" : "Rifa pausada ✓");
    load();
  }

  async function finish() {
    const n = parseInt(winnerInput, 10);
    if (!n) return show("err", "Digite o número sorteado.");
    const t = tickets.find((x) => x.number === n);
    const who = t?.status === "sold" ? `Ganhador: ${t.buyerName}` : "ATENÇÃO: esse número NÃO foi vendido.";
    if (!confirm(`Confirmar número sorteado ${n}?\n${who}\n\nA rifa será encerrada e sai do site.`)) return;
    const res = await fetch(`/api/admin/raffles/${id}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerNumber: n }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return show("err", data.error || "Erro.");
    show("ok", "Rifa sorteada e encerrada ✓");
    load();
  }

  async function remove() {
    if (!confirm("Apagar esta rifa de vez? Isso não pode ser desfeito.")) return;
    const res = await fetch(`/api/admin/raffles/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return show("err", data.error || "Erro.");
    router.push("/admin/dashboard");
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await resizeImage(file);
        const res = await fetch(`/api/admin/raffles/${id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          show("err", data.error || "Erro ao enviar foto.");
          break;
        }
      }
    } catch (e: any) {
      show("err", e?.message || "Erro ao enviar foto.");
    }
    setUploading(false);
    load();
  }

  async function imageAction(imageId: string, method: "DELETE" | "POST") {
    if (method === "DELETE" && !confirm("Remover esta foto?")) return;
    await fetch(`/api/admin/images/${imageId}`, { method });
    load();
  }

  async function ticketAction(number: number, action: "sell" | "release") {
    if (action === "release") {
      const t = tickets.find((x) => x.number === number);
      if (t?.status === "sold" && !confirm(`Liberar o número ${number}? O comprador (${t.buyerName}) perde o número.`)) return;
    }
    const res = await fetch("/api/admin/numbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raffleId: raffle?.id,
        number,
        action,
        buyerName: sellName,
        buyerPhone: sellPhone,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return show("err", data.error || "Erro.");
    setSellFor(null);
    setSellName("");
    setSellPhone("");
    load();
  }

  const summary = useMemo(() => {
    const sold = tickets.filter((t) => t.status === "sold").length;
    const reserved = tickets.filter((t) => t.status === "reserved").length;
    return { sold, reserved, available: tickets.length - sold - reserved };
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return tickets.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (!q) return true;
      return (
        (qDigits && String(t.number).includes(qDigits)) ||
        (t.buyerName || "").toLowerCase().includes(q) ||
        (qDigits.length >= 4 && (t.buyerPhone || "").includes(qDigits)) ||
        (t.buyerEmail || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, filter, search]);

  const finished = raffle?.status === "finished";
  const total = raffle?.totalNumbers || 0;

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-8 text-neutral-400">Carregando...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminTopBar title={isNew ? "Nova rifa" : raffle?.title || "Rifa"} back="/admin/dashboard" />

      {msg && (
        <p
          className={`mb-4 rounded-lg p-3 text-sm ${
            msg.type === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}

      {conflicts.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-bold">⚠️ Pagamento(s) que precisam da sua atenção</p>
          <p className="mt-1 text-red-300">
            Essas pessoas pagaram, mas algum número já tinha sido vendido pra outra pessoa. Combine outro número ou devolva o valor.
          </p>
          <ul className="mt-2 space-y-1">
            {conflicts.map((c) => (
              <li key={c.id}>
                {c.buyerName} ({formatPhone(c.buyerPhone)}) — números {c.numbers.join(", ")} — {formatBRL(c.amountCents)}{" "}
                <a className="underline" target="_blank" rel="noopener noreferrer" href={whatsappLink(c.buyerPhone)}>
                  chamar no WhatsApp
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== AÇÕES ===== */}
      {raffle && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={raffle.status} />
              {finished && raffle.winnerNumber !== null && (
                <span className="text-sm text-amber-300">
                  🏆 Nº {padNumber(raffle.winnerNumber, total)} — {raffle.winnerName || "não vendido"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {raffle.status === "draft" && (
                <button onClick={() => setActive(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500">
                  ▶ Colocar à venda
                </button>
              )}
              {raffle.status === "active" && (
                <button onClick={() => setActive(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
                  ⏸ Pausar vendas
                </button>
              )}
              <a
                href={`/api/admin/export?raffle=${raffle.id}`}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
              >
                ⬇ Planilha de vendas
              </a>
              {summary.sold === 0 && (
                <button onClick={remove} className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
                  Apagar
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Vendidos" value={`${summary.sold} / ${total}`} />
            <Mini label="Arrecadado" value={formatBRL(summary.sold * raffle.priceCents)} />
            <Mini label="Aguardando PIX" value={String(summary.reserved)} />
            <Mini label="Disponíveis" value={String(summary.available)} />
          </div>

          {!finished && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-sm font-semibold">🎲 Sortear / encerrar</p>
              <p className="text-xs text-neutral-400">
                Depois do sorteio, digite o número que saiu. A rifa sai do site e o ganhador aparece em &quot;Ganhadores&quot;.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  inputMode="numeric"
                  value={winnerInput}
                  onChange={(e) => setWinnerInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nº sorteado"
                  className={`${inputCls} max-w-[160px]`}
                />
                <button onClick={finish} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-amber-300">
                  Encerrar com esse número
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ===== DADOS DA RIFA ===== */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">{isNew ? "Dados da nova rifa" : "Dados da rifa"}</h2>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da rifa *" className="sm:col-span-2">
            <input required disabled={finished} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Ex: Rifa do iPhone 16" />
          </Field>
          <Field label="Prêmio" className="sm:col-span-2">
            <input disabled={finished} value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} className={inputCls} placeholder="Ex: iPhone 16 128GB lacrado" />
          </Field>
          <Field label="Descrição" className="sm:col-span-2" hint="Aparece no topo da página. Conte detalhes do prêmio.">
            <textarea disabled={finished} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Preço por número (R$) *">
            <input required disabled={finished} inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="10,00" />
          </Field>
          <Field label="Quantidade de números *" hint="De 10 a 10.000">
            <input required disabled={finished} inputMode="numeric" value={form.totalNumbers} onChange={(e) => setForm({ ...form, totalNumbers: e.target.value.replace(/\D/g, "") })} className={inputCls} />
          </Field>
          <Field label="Data e hora do sorteio">
            <input disabled={finished} type="datetime-local" value={form.drawDate} onChange={(e) => setForm({ ...form, drawDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Como vai ser o sorteio">
            <input disabled={finished} value={form.drawMethod} onChange={(e) => setForm({ ...form, drawMethod: e.target.value })} className={inputCls} placeholder="Ex: Live no Instagram" />
          </Field>
          <Field label="Regulamento" className="sm:col-span-2">
            <textarea disabled={finished} rows={6} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} className={inputCls} />
          </Field>
          {!finished && (
            <div className="sm:col-span-2">
              <button disabled={saving} className="rounded-lg bg-amber-400 px-6 py-2.5 font-bold text-neutral-950 hover:bg-amber-300 disabled:opacity-60">
                {saving ? "Salvando..." : isNew ? "Criar rifa" : "Salvar alterações"}
              </button>
              {isNew && (
                <p className="mt-2 text-xs text-neutral-400">
                  A rifa é criada pausada. Depois você adiciona as fotos e clica em &quot;Colocar à venda&quot;.
                </p>
              )}
            </div>
          )}
        </form>
      </Card>

      {/* ===== FOTOS ===== */}
      {raffle && (
        <Card className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Fotos do prêmio</h2>
              <p className="text-xs text-neutral-400">A primeira foto é a principal. Até 8 fotos.</p>
            </div>
            {!finished && (
              <label className={`cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 ${uploading ? "opacity-60" : ""}`}>
                {uploading ? "Enviando..." : "+ Adicionar fotos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    uploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          {images.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma foto ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((imgId, i) => (
                <div key={imgId} className="overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/imagem/${imgId}`} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="flex justify-between gap-1 p-2 text-xs">
                    {i === 0 ? (
                      <span className="text-amber-300">★ Principal</span>
                    ) : (
                      <button onClick={() => imageAction(imgId, "POST")} className="text-neutral-300 hover:text-white">
                        Tornar principal
                      </button>
                    )}
                    {!finished && (
                      <button onClick={() => imageAction(imgId, "DELETE")} className="text-red-300 hover:text-red-200">
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ===== NÚMEROS ===== */}
      {raffle && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">Números e compradores</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["sold", "reserved", "available", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  filter === f ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 text-neutral-300"
                }`}
              >
                {f === "sold" ? `Vendidos (${summary.sold})` : f === "reserved" ? `Aguardando PIX (${summary.reserved})` : f === "available" ? `Disponíveis (${summary.available})` : "Todos"}
              </button>
            ))}
            <input
              placeholder="Buscar número, nome, telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-1.5 text-sm sm:w-64"
            />
          </div>

          <div className="max-h-[600px] overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="p-2 text-left">Nº</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Comprador</th>
                  <th className="p-2 text-left">WhatsApp</th>
                  <th className="p-2 text-left">Pago em</th>
                  <th className="p-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 1000).map((t) => (
                  <tr key={t.number} className="border-t border-white/5 align-top">
                    <td className="p-2 font-mono">{padNumber(t.number, total)}</td>
                    <td className="p-2">
                      <TicketBadge status={t.status} />
                    </td>
                    <td className="p-2">{t.buyerName || "—"}</td>
                    <td className="p-2">
                      {t.buyerPhone ? (
                        <a className="text-emerald-300 hover:underline" target="_blank" rel="noopener noreferrer" href={whatsappLink(t.buyerPhone)}>
                          {formatPhone(t.buyerPhone)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2 text-neutral-400">{t.soldAt ? formatDateTime(t.soldAt) : "—"}</td>
                    <td className="p-2">
                      {finished ? null : sellFor === t.number ? (
                        <div className="flex flex-col gap-1.5">
                          <input autoFocus placeholder="Nome" value={sellName} onChange={(e) => setSellName(e.target.value)} className="rounded border border-white/10 bg-neutral-800 px-2 py-1" />
                          <input placeholder="WhatsApp" value={sellPhone} onChange={(e) => setSellPhone(maskPhoneInput(e.target.value))} className="rounded border border-white/10 bg-neutral-800 px-2 py-1" />
                          <div className="flex gap-1">
                            <button onClick={() => ticketAction(t.number, "sell")} className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                              Confirmar
                            </button>
                            <button onClick={() => setSellFor(null)} className="rounded border border-white/10 px-2 py-1 text-xs">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          {t.status !== "sold" && (
                            <button
                              onClick={() => {
                                setSellFor(t.number);
                                setSellName("");
                                setSellPhone("");
                              }}
                              className="rounded border border-emerald-800 bg-emerald-900/30 px-2 py-1 text-xs hover:bg-emerald-900/60"
                              title="Venda feita fora do site (dinheiro, PIX direto...)"
                            >
                              Vender manual
                            </button>
                          )}
                          {t.status !== "available" && (
                            <button onClick={() => ticketAction(t.number, "release")} className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/5">
                              Liberar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-4 text-center text-sm text-neutral-500">Nada por aqui.</p>}
            {filtered.length > 1000 && (
              <p className="p-3 text-center text-xs text-neutral-500">Mostrando 1000 de {filtered.length}. Use a busca para achar outros.</p>
            )}
          </div>
        </Card>
      )}
    </main>
  );
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm text-neutral-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 p-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 font-bold">{value}</p>
    </div>
  );
}

function TicketBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    available: ["Disponível", "border-neutral-700 text-neutral-300"],
    reserved: ["Aguardando PIX", "border-yellow-800 bg-yellow-900/30 text-yellow-300"],
    sold: ["Vendido", "border-emerald-800 bg-emerald-900/30 text-emerald-300"],
  };
  const [label, cls] = map[status] || [status, ""];
  return <span className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatBRL, formatDateTime, maskPhoneInput, padNumber, whatsappLink } from "@/lib/format";

type Step = "form" | "loading" | "pix" | "success" | "expired" | "error";

export default function BuyModal({
  raffleId,
  raffleTitle,
  drawDate,
  totalNumbers,
  selectedNumbers: initialNumbers,
  totalCents: initialTotalCents,
  reserveMinutes,
  onClose,
  onSuccess,
  onConflict,
}: {
  raffleId: number;
  raffleTitle: string;
  drawDate: string | null;
  totalNumbers: number;
  selectedNumbers: number[];
  totalCents: number;
  reserveMinutes: number;
  onClose: () => void;
  onSuccess: (ids: number[]) => void;
  onConflict: () => void;
}) {
  // Guarda os números e o total do momento em que a compra começou
  // (a lista da página pode mudar enquanto o modal está aberto).
  const [selectedNumbers] = useState<number[]>(initialNumbers);
  const [totalCents] = useState<number>(initialTotalCents);
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [pix, setPix] = useState<{
    purchaseId: string;
    qrCodeBase64: string;
    copiaECola: string;
    expiresAt: string;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lembra os dados do comprador neste aparelho, pra próxima compra ser mais rápida.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("rifa_comprador") || "{}");
      if (saved.name) setName(saved.name);
      if (saved.phone) setPhone(saved.phone);
      if (saved.email) setEmail(saved.email);
    } catch {}
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== "pix") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const labels = selectedNumbers.map((n) => padNumber(n, totalNumbers));
  const secondsLeft = pix ? Math.max(0, Math.floor((new Date(pix.expiresAt).getTime() - now) / 1000)) : 0;
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setStep("loading");
    try {
      localStorage.setItem("rifa_comprador", JSON.stringify({ name, phone, email }));
    } catch {}

    try {
      const res = await fetch("/api/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raffleId, numbers: selectedNumbers, name, phone, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.conflict) {
          onConflict();
          return;
        }
        setErrorMsg(data.error || "Não foi possível gerar o PIX.");
        setStep("error");
        return;
      }
      setPix({
        purchaseId: data.purchaseId,
        qrCodeBase64: data.qrCodeBase64,
        copiaECola: data.copiaECola,
        expiresAt: data.expiresAt,
      });
      setNow(Date.now());
      setStep("pix");
      startPolling(data.purchaseId);
    } catch {
      setErrorMsg("Erro de conexão. Verifique sua internet e tente novamente.");
      setStep("error");
    }
  }

  function startPolling(purchaseId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status/${purchaseId}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "approved") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
          onSuccess(selectedNumbers);
        } else if (data.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("expired");
        }
      } catch {
        // ignora falhas pontuais
      }
    }, 4000);
  }

  async function copyCode() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const shareText =
    `🍀 Comprei ${labels.length > 1 ? "os números" : "o número"} ${labels.join(", ")} na rifa "${raffleTitle}"!` +
    (drawDate ? `\n📅 Sorteio: ${formatDateTime(drawDate)}` : "") +
    (typeof window !== "undefined" ? `\n🔎 Consultar: ${window.location.origin}/meus-numeros` : "");

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2.5 outline-none focus:border-amber-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4">
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-neutral-900 p-6 sm:max-w-md sm:rounded-2xl">
        {step !== "loading" && (
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        )}

        {step !== "success" && (
          <>
            <h2 className="text-lg font-bold">Finalizar compra</h2>
            <div className="mt-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto">
              {labels.map((l) => (
                <span key={l} className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-xs text-amber-300">{l}</span>
              ))}
            </div>
            <p className="mt-2 text-sm text-neutral-400">
              Total: <b className="text-lg text-white">{formatBRL(totalCents)}</b>
            </p>
          </>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-300">Nome completo</label>
              <input required minLength={3} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">WhatsApp</label>
              <input
                required
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
                placeholder="(41) 99999-9999"
                className={inputCls}
                autoComplete="tel"
              />
              <p className="mt-1 text-xs text-neutral-500">Use esse número pra consultar seus números depois.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">E-mail</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 font-bold text-white hover:brightness-110"
            >
              Gerar PIX de {formatBRL(totalCents)}
            </button>
            <p className="text-center text-xs text-neutral-500">
              Os números ficam reservados por {reserveMinutes} minutos enquanto você paga.
            </p>
          </form>
        )}

        {step === "loading" && (
          <div className="py-12 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-amber-400" />
            <p className="mt-4 text-neutral-400">Gerando seu PIX...</p>
          </div>
        )}

        {step === "pix" && pix && (
          <div className="mt-4 space-y-3 text-center">
            <div
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                secondsLeft <= 300 ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"
              }`}
            >
              {secondsLeft > 0 ? (
                <>⏱️ Pague em até <span className="font-mono">{countdown}</span></>
              ) : (
                "Tempo esgotado. Se ainda não pagou, não pague este código."
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code PIX"
              className="mx-auto h-52 w-52 rounded-xl bg-white p-2"
            />
            <p className="text-sm text-neutral-400">Abra o app do seu banco e escaneie, ou copie o código:</p>
            <textarea
              readOnly
              value={pix.copiaECola}
              onFocus={(e) => e.currentTarget.select()}
              className="h-20 w-full rounded-lg border border-white/10 bg-neutral-800 p-2 text-xs"
            />
            <button
              onClick={copyCode}
              className={`w-full rounded-xl py-3 font-bold transition ${
                copied ? "bg-emerald-600 text-white" : "bg-amber-400 text-neutral-950 hover:bg-amber-300"
              }`}
            >
              {copied ? "✓ Código copiado!" : "Copiar código PIX"}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Aguardando pagamento… a confirmação aparece aqui sozinha.
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-4 text-center">
            <p className="text-5xl">🎉</p>
            <p className="mt-3 text-xl font-bold">Pagamento confirmado!</p>
            <p className="mt-1 text-sm text-neutral-400">Seus números estão garantidos. Boa sorte!</p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {labels.map((l) => (
                <span key={l} className="rounded-lg bg-amber-400 px-2.5 py-1 font-mono font-bold text-neutral-950">{l}</span>
              ))}
            </div>
            <a
              href={whatsappLink("", shareText)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-500"
            >
              💬 Salvar no meu WhatsApp
            </a>
            <p className="mt-1 text-xs text-neutral-500">Envie pra você mesmo ou pra um amigo e não esqueça seus números.</p>
            <Link
              href="/meus-numeros"
              className="mt-3 block w-full rounded-xl border border-white/10 py-3 text-sm font-semibold hover:bg-white/5"
            >
              Ver todos os meus números
            </Link>
            <button onClick={onClose} className="mt-3 text-sm text-neutral-400 underline hover:text-white">
              Fechar
            </button>
          </div>
        )}

        {step === "expired" && (
          <div className="py-6 text-center">
            <p className="text-4xl">⌛</p>
            <p className="mt-3 font-semibold">O tempo para pagamento acabou.</p>
            <p className="mt-1 text-sm text-neutral-400">
              Os números foram liberados. Se quiser, escolha de novo e gere outro PIX.
            </p>
            <button onClick={onClose} className="mt-5 rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/5">
              Voltar
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="py-6 text-center">
            <p className="text-4xl">⚠️</p>
            <p className="mt-3 text-sm text-red-300">{errorMsg}</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setStep("form")} className="rounded-xl bg-amber-400 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-amber-300">
                Tentar de novo
              </button>
              <button onClick={onClose} className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/5">
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

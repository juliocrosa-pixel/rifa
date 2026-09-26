"use client";

import { useEffect, useRef, useState } from "react";

type Step = "form" | "loading" | "pix" | "success" | "error";

export default function BuyModal({
  selectedNumbers,
  total,
  onClose,
  onSuccess,
  onExpiredOrCancelled,
}: {
  selectedNumbers: number[];
  total: number;
  onClose: () => void;
  onSuccess: (soldIds: number[]) => void;
  onExpiredOrCancelled: (numberIds: number[]) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [pixData, setPixData] = useState<{
    paymentId: string;
    qrCodeBase64: string;
    copiaECola: string;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setStep("loading");
    try {
      const res = await fetch("/api/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers: selectedNumbers,
          name,
          phone,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Não foi possível gerar o PIX.");
        setStep("error");
        return;
      }
      setPixData({
        paymentId: data.paymentId,
        qrCodeBase64: data.qrCodeBase64,
        copiaECola: data.copiaECola,
      });
      setStep("pix");
      startPolling(data.paymentId);
    } catch (err) {
      setErrorMsg("Erro de conexão. Tente novamente.");
      setStep("error");
    }
  }

  function startPolling(paymentId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status/${paymentId}`);
        const data = await res.json();
        if (data.status === "approved") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
          onSuccess(selectedNumbers);
        } else if (data.status === "cancelled" || data.status === "rejected" || data.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setErrorMsg("O pagamento não foi concluído a tempo.");
          setStep("error");
          onExpiredOrCancelled(selectedNumbers);
        }
      } catch {
        // ignora falhas pontuais de polling
      }
    }, 5000);
  }

  function copyCode() {
    if (pixData) navigator.clipboard.writeText(pixData.copiaECola);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {step !== "success" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-300"
          >
            ✕
          </button>
        )}

        <h2 className="text-lg font-bold mb-1">Finalizar compra</h2>
        <p className="text-sm text-neutral-400 mb-4">
          Números: {selectedNumbers.join(", ")} · Total: R$ {total.toFixed(2)}
        </p>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nome completo</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">WhatsApp</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(41) 99999-9999"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">E-mail</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg mt-2"
            >
              Gerar PIX
            </button>
          </form>
        )}

        {step === "loading" && (
          <p className="text-center py-8 text-neutral-400">Gerando cobrança PIX...</p>
        )}

        {step === "pix" && pixData && (
          <div className="text-center space-y-3">
            <img
              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
              alt="QR Code PIX"
              className="mx-auto w-48 h-48 bg-white p-2 rounded-lg"
            />
            <p className="text-sm text-neutral-400">Escaneie o QR code ou copie o código abaixo</p>
            <textarea
              readOnly
              value={pixData.copiaECola}
              className="w-full text-xs bg-neutral-800 border border-neutral-700 rounded-lg p-2 h-20"
            />
            <button
              onClick={copyCode}
              className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 py-2 rounded-lg"
            >
              Copiar código PIX
            </button>
            <p className="text-xs text-neutral-500">
              Aguardando confirmação do pagamento... isso pode levar alguns segundos após você pagar.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6 space-y-2">
            <p className="text-4xl">🎉</p>
            <p className="font-medium">Pagamento confirmado!</p>
            <p className="text-sm text-neutral-400">
              Seus números ({selectedNumbers.join(", ")}) foram registrados. Boa sorte!
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-lg"
            >
              Fechar
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-6 space-y-2">
            <p className="text-4xl">⚠️</p>
            <p className="text-sm text-red-400">{errorMsg}</p>
            <button
              onClick={onClose}
              className="mt-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-5 py-2 rounded-lg"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

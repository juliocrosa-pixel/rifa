// Funções de formatação usadas tanto no servidor quanto no navegador.

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "10,50" / "10.50" / "10" -> 1050. Retorna null se inválido.
export function parsePriceToCents(value: string | number): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value * 100);
  }
  let v = String(value).trim().replace(/[R$\s]/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function padNumber(n: number, total: number): string {
  const digits = Math.max(2, String(total).length);
  return String(n).padStart(digits, "0");
}

// Deixa só os dígitos e tira o 55 do Brasil, pra comparar telefones de forma consistente.
export function normalizePhone(phone: string): string {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d;
}

export function formatPhone(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

// Máscara enquanto digita: (41) 99999-9999
export function maskPhoneInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// "João da Silva" -> "João S." (pra mostrar ganhador sem expor o nome todo)
export function shortName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export function whatsappLink(phone: string, text?: string): string {
  let d = String(phone || "").replace(/\D/g, "");
  if (d && !d.startsWith("55")) d = `55${d}`;
  const base = d ? `https://wa.me/${d}` : "https://wa.me/";
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

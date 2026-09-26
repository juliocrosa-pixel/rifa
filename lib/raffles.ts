import { prisma } from "@/lib/prisma";

// Tempo pra pagar o PIX. O Mercado Pago exige no mínimo 30 minutos de validade pro PIX,
// então a reserva do número dura o mesmo tempo que o QR code.
const MIN_RESERVE_MINUTES = 30;
// Margem depois do vencimento, pra um pagamento feito no último minuto chegar antes de liberar.
export const GRACE_MINUTES = 2;

export function getReserveMinutes(): number {
  const value = parseInt(process.env.RESERVE_MINUTES || "30", 10);
  if (!Number.isFinite(value)) return MIN_RESERVE_MINUTES;
  return Math.max(value, MIN_RESERVE_MINUTES);
}

export const MAX_NUMBERS_PER_RAFFLE = 10000;
export const MAX_NUMBERS_PER_PURCHASE = 500;

export async function getActiveRaffle() {
  return prisma.raffle.findFirst({
    where: { status: "active" },
    orderBy: { updatedAt: "desc" },
  });
}

// Libera os números reservados cujo PIX já venceu (e marca as compras como expiradas).
// Chamado sempre que alguém abre o site, atualiza a lista, compra ou consulta status.
export async function releaseExpiredReservations(raffleId?: number): Promise<number> {
  const cutoff = new Date(Date.now() - (getReserveMinutes() + GRACE_MINUTES) * 60 * 1000);

  const released = await prisma.ticket.updateMany({
    where: {
      status: "reserved",
      reservedAt: { lt: cutoff },
      ...(raffleId ? { raffleId } : {}),
    },
    data: {
      status: "available",
      buyerName: null,
      buyerPhone: null,
      buyerEmail: null,
      purchaseId: null,
      reservedAt: null,
    },
  });

  await prisma.purchase.updateMany({
    where: {
      status: "pending",
      createdAt: { lt: cutoff },
      ...(raffleId ? { raffleId } : {}),
    },
    data: { status: "expired" },
  });

  return released.count;
}

// Status de todos os números como texto compacto: "a" disponível, "r" reservado, "s" vendido.
// A posição 0 é o número 1, a posição 1 é o número 2, e assim por diante.
export async function getStatusString(raffleId: number, totalNumbers: number): Promise<string> {
  const tickets = await prisma.ticket.findMany({
    where: { raffleId, status: { not: "available" } },
    select: { number: true, status: true },
  });
  const arr: string[] = new Array(totalNumbers).fill("a");
  for (const t of tickets) {
    if (t.number >= 1 && t.number <= totalNumbers) {
      arr[t.number - 1] = t.status === "sold" ? "s" : "r";
    }
  }
  return arr.join("");
}

// Cria os números 1..total de uma rifa (em blocos, pra não estourar o banco).
export async function createTickets(raffleId: number, from: number, to: number) {
  const chunk = 1000;
  for (let start = from; start <= to; start += chunk) {
    const end = Math.min(to, start + chunk - 1);
    const data: { raffleId: number; number: number }[] = [];
    for (let n = start; n <= end; n++) data.push({ raffleId, number: n });
    await prisma.ticket.createMany({ data, skipDuplicates: true });
  }
}

export type SiteSettings = {
  siteName: string;
  whatsapp: string;
  instagram: string;
};

export async function getSettings(): Promise<SiteSettings> {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await prisma.setting.findMany();
  } catch (e) {
    // Tabela ainda não criada (falta rodar /api/setup): usa os valores padrão.
    console.error("Configurações indisponíveis:", e);
  }
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    siteName: map.siteName || "Rifa Online",
    whatsapp: map.whatsapp || "",
    instagram: map.instagram || "",
  };
}

export async function saveSettings(s: Partial<SiteSettings>) {
  const entries = Object.entries(s).filter(([, v]) => typeof v === "string") as [string, string][];
  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value.trim() },
      update: { value: value.trim() },
    });
  }
}

// Dados públicos de uma rifa, prontos pra mandar pro navegador (datas como texto).
export function serializeRaffle(r: {
  id: number;
  title: string;
  prize: string;
  description: string;
  rules: string;
  priceCents: number;
  totalNumbers: number;
  drawDate: Date | null;
  drawMethod: string;
  status: string;
  winnerNumber: number | null;
  winnerName: string | null;
  finishedAt: Date | null;
}) {
  return {
    id: r.id,
    title: r.title,
    prize: r.prize,
    description: r.description,
    rules: r.rules,
    priceCents: r.priceCents,
    totalNumbers: r.totalNumbers,
    drawDate: r.drawDate ? r.drawDate.toISOString() : null,
    drawMethod: r.drawMethod,
    status: r.status,
    winnerNumber: r.winnerNumber,
    winnerName: r.winnerName,
    finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
  };
}

export type PublicRaffle = ReturnType<typeof serializeRaffle>;

export async function getImageIds(raffleId: number): Promise<string[]> {
  const imgs = await prisma.raffleImage.findMany({
    where: { raffleId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return imgs.map((i) => i.id);
}

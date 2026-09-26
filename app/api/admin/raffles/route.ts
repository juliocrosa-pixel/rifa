import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTickets, releaseExpiredReservations } from "@/lib/raffles";
import { parseRaffleInput } from "@/lib/admin-raffle";

export const dynamic = "force-dynamic";

// Lista todas as rifas com resumo de vendas.
export async function GET() {
  await releaseExpiredReservations();

  const raffles = await prisma.raffle.findMany({ orderBy: { createdAt: "desc" } });
  const counts = await prisma.ticket.groupBy({
    by: ["raffleId", "status"],
    _count: { _all: true },
  });

  const list = raffles.map((r) => {
    const c = (status: string) =>
      counts.find((x) => x.raffleId === r.id && x.status === status)?._count._all || 0;
    const sold = c("sold");
    return {
      id: r.id,
      title: r.title,
      prize: r.prize,
      status: r.status,
      priceCents: r.priceCents,
      totalNumbers: r.totalNumbers,
      drawDate: r.drawDate ? r.drawDate.toISOString() : null,
      winnerNumber: r.winnerNumber,
      winnerName: r.winnerName,
      createdAt: r.createdAt.toISOString(),
      sold,
      reserved: c("reserved"),
      revenueCents: sold * r.priceCents,
    };
  });

  return NextResponse.json({ raffles: list });
}

// Cria uma rifa nova (como rascunho) e todos os números dela.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { data, error } = parseRaffleInput(body);
  if (!data) return NextResponse.json({ error }, { status: 400 });

  const raffle = await prisma.raffle.create({ data: { ...data, status: "draft" } });
  await createTickets(raffle.id, 1, data.totalNumbers);

  return NextResponse.json({ id: raffle.id });
}

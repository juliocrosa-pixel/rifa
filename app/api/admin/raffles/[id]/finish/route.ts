import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Encerra a rifa e registra o número sorteado. POST { winnerNumber }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const body = await req.json().catch(() => ({}));
  const winnerNumber = parseInt(String(body?.winnerNumber || ""), 10);

  const raffle = await prisma.raffle.findUnique({ where: { id } });
  if (!raffle) return NextResponse.json({ error: "Rifa não encontrada." }, { status: 404 });
  if (raffle.status === "finished") {
    return NextResponse.json({ error: "Essa rifa já foi sorteada." }, { status: 400 });
  }
  if (!Number.isInteger(winnerNumber) || winnerNumber < 1 || winnerNumber > raffle.totalNumbers) {
    return NextResponse.json({ error: "Número sorteado inválido." }, { status: 400 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { raffleId_number: { raffleId: id, number: winnerNumber } },
  });
  const winnerName = ticket?.status === "sold" ? ticket.buyerName || "Comprador" : null;

  // Reservas pendentes são canceladas: a rifa acabou.
  await prisma.ticket.updateMany({
    where: { raffleId: id, status: "reserved" },
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
    where: { raffleId: id, status: "pending" },
    data: { status: "expired" },
  });

  await prisma.raffle.update({
    where: { id },
    data: { status: "finished", winnerNumber, winnerName, finishedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    winnerName,
    winnerPhone: ticket?.status === "sold" ? ticket.buyerPhone : null,
    sold: ticket?.status === "sold",
  });
}

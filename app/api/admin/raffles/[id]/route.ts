import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTickets, getImageIds, releaseExpiredReservations, serializeRaffle } from "@/lib/raffles";
import { parseRaffleInput } from "@/lib/admin-raffle";

export const dynamic = "force-dynamic";

function getId(params: { id: string }) {
  const id = parseInt(params.id, 10);
  return Number.isInteger(id) ? id : null;
}

// Detalhes da rifa + todos os números (com dados do comprador) pro painel.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = getId(params);
  if (!id) return NextResponse.json({ error: "Rifa inválida." }, { status: 400 });

  await releaseExpiredReservations(id);
  const raffle = await prisma.raffle.findUnique({ where: { id } });
  if (!raffle) return NextResponse.json({ error: "Rifa não encontrada." }, { status: 404 });

  const tickets = await prisma.ticket.findMany({
    where: { raffleId: id },
    orderBy: { number: "asc" },
    select: {
      number: true,
      status: true,
      buyerName: true,
      buyerPhone: true,
      buyerEmail: true,
      soldAt: true,
      purchaseId: true,
    },
  });

  const conflicts = await prisma.purchase.findMany({
    where: { raffleId: id, status: "paid_conflict" },
    select: { id: true, buyerName: true, buyerPhone: true, numbers: true, amountCents: true, paidAt: true },
  });

  return NextResponse.json({
    raffle: serializeRaffle(raffle),
    images: await getImageIds(id),
    tickets: tickets.map((t) => ({ ...t, soldAt: t.soldAt ? t.soldAt.toISOString() : null })),
    conflicts: conflicts.map((c) => ({ ...c, paidAt: c.paidAt ? c.paidAt.toISOString() : null })),
  });
}

// Edita a rifa. A quantidade de números só pode diminuir se os números removidos estiverem livres.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = getId(params);
  if (!id) return NextResponse.json({ error: "Rifa inválida." }, { status: 400 });

  const raffle = await prisma.raffle.findUnique({ where: { id } });
  if (!raffle) return NextResponse.json({ error: "Rifa não encontrada." }, { status: 404 });
  if (raffle.status === "finished") {
    return NextResponse.json({ error: "Rifa já sorteada não pode ser editada." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { data, error } = parseRaffleInput(body);
  if (!data) return NextResponse.json({ error }, { status: 400 });

  if (data.totalNumbers < raffle.totalNumbers) {
    const busy = await prisma.ticket.count({
      where: { raffleId: id, number: { gt: data.totalNumbers }, status: { not: "available" } },
    });
    if (busy > 0) {
      return NextResponse.json(
        { error: "Não dá pra diminuir: já tem número vendido/reservado acima desse total." },
        { status: 400 }
      );
    }
    await prisma.ticket.deleteMany({ where: { raffleId: id, number: { gt: data.totalNumbers } } });
  } else if (data.totalNumbers > raffle.totalNumbers) {
    await createTickets(id, raffle.totalNumbers + 1, data.totalNumbers);
  }

  await prisma.raffle.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// Apaga a rifa — só se não tiver nenhum número vendido.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = getId(params);
  if (!id) return NextResponse.json({ error: "Rifa inválida." }, { status: 400 });

  const sold = await prisma.ticket.count({ where: { raffleId: id, status: "sold" } });
  if (sold > 0) {
    return NextResponse.json(
      { error: "Essa rifa já tem números vendidos e não pode ser apagada." },
      { status: 400 }
    );
  }
  await prisma.raffle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

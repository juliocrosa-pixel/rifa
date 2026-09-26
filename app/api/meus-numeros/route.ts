import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/format";

export const dynamic = "force-dynamic";

// Busca os números PAGOS de um comprador pelo WhatsApp ou e-mail, agrupados por rifa.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const contact = String(body.contact || "").trim();
  if (!contact) {
    return NextResponse.json({ error: "Informe seu WhatsApp ou e-mail." }, { status: 400 });
  }

  const isEmail = contact.includes("@");
  const phone = normalizePhone(contact);
  if (!isEmail && phone.length < 10) {
    return NextResponse.json({ error: "WhatsApp inválido. Use DDD + número." }, { status: 400 });
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      status: "sold",
      ...(isEmail ? { buyerEmail: contact.toLowerCase() } : { buyerPhone: phone }),
    },
    orderBy: [{ raffleId: "desc" }, { number: "asc" }],
    select: {
      number: true,
      soldAt: true,
      raffle: {
        select: {
          id: true,
          title: true,
          totalNumbers: true,
          status: true,
          drawDate: true,
          winnerNumber: true,
        },
      },
    },
  });

  const groups: Record<
    number,
    {
      raffleId: number;
      title: string;
      totalNumbers: number;
      status: string;
      drawDate: string | null;
      winnerNumber: number | null;
      numbers: number[];
    }
  > = {};

  for (const t of tickets) {
    const r = t.raffle;
    if (!groups[r.id]) {
      groups[r.id] = {
        raffleId: r.id,
        title: r.title,
        totalNumbers: r.totalNumbers,
        status: r.status,
        drawDate: r.drawDate ? r.drawDate.toISOString() : null,
        winnerNumber: r.winnerNumber,
        numbers: [],
      };
    }
    groups[r.id].numbers.push(t.number);
  }

  const raffles = Object.values(groups).sort((a, b) => b.raffleId - a.raffleId);
  return NextResponse.json({ raffles });
}

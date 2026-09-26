import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/format";

export const dynamic = "force-dynamic";

// Edição manual de um número pelo painel.
// PATCH { raffleId, number, action: "sell" | "release", buyerName?, buyerPhone? }
// "sell" serve pra venda fora do site (dinheiro, PIX direto). "release" volta pra disponível.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const raffleId = parseInt(String(body?.raffleId || ""), 10);
  const number = parseInt(String(body?.number || ""), 10);
  const action = body?.action;

  if (!raffleId || !number || !["sell", "release"].includes(action)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const where = { raffleId_number: { raffleId, number } };
  const ticket = await prisma.ticket.findUnique({ where });
  if (!ticket) return NextResponse.json({ error: "Número não encontrado." }, { status: 404 });

  if (action === "sell") {
    const buyerName = String(body?.buyerName || "").trim().slice(0, 120);
    if (!buyerName) return NextResponse.json({ error: "Informe o nome do comprador." }, { status: 400 });
    const updated = await prisma.ticket.update({
      where,
      data: {
        status: "sold",
        soldAt: new Date(),
        buyerName,
        buyerPhone: body?.buyerPhone ? normalizePhone(String(body.buyerPhone)) : null,
        buyerEmail: body?.buyerEmail ? String(body.buyerEmail).trim().toLowerCase() : null,
        reservedAt: null,
      },
    });
    return NextResponse.json({ ok: true, number: updated.number });
  }

  await prisma.ticket.update({
    where,
    data: {
      status: "available",
      buyerName: null,
      buyerPhone: null,
      buyerEmail: null,
      purchaseId: null,
      reservedAt: null,
      soldAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}

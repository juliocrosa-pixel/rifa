import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const numbers = await prisma.raffleNumber.findMany({
    orderBy: { id: "asc" },
  });

  const total = numbers.length;
  const sold = numbers.filter((n) => n.status === "sold").length;
  const reserved = numbers.filter((n) => n.status === "reserved").length;
  const available = total - sold - reserved;

  return NextResponse.json({
    numbers,
    summary: { total, sold, reserved, available },
  });
}

// Edição manual: marcar como vendido (pagamento fora do sistema, ex. dinheiro)
// ou liberar de volta pra disponível.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id, status, buyerName, buyerPhone } = body;

  if (!id || !["available", "sold", "reserved"].includes(status)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const data: Record<string, unknown> = { status };

  if (status === "sold") {
    data.soldAt = new Date();
    if (buyerName) data.buyerName = buyerName;
    if (buyerPhone) data.buyerPhone = buyerPhone;
  }

  if (status === "available") {
    data.buyerName = null;
    data.buyerPhone = null;
    data.buyerEmail = null;
    data.paymentId = null;
    data.reservedAt = null;
    data.soldAt = null;
  }

  const updated = await prisma.raffleNumber.update({
    where: { id: Number(id) },
    data,
  });

  return NextResponse.json({ number: updated });
}

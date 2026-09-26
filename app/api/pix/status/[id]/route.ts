import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const paymentId = params.id;
  await releaseExpiredReservations();

  const numbers = await prisma.raffleNumber.findMany({
    where: { paymentId },
  });

  if (numbers.length === 0) {
    return NextResponse.json({ status: "unknown" });
  }

  // O status "oficial" é mantido pelo webhook do Mercado Pago, que atualiza
  // os números pra "sold" (aprovado) ou de volta pra "available" (recusado/expirado).
  const anySold = numbers.some((n) => n.status === "sold");
  const anyReserved = numbers.some((n) => n.status === "reserved");

  if (anySold) {
    return NextResponse.json({ status: "approved" });
  }
  if (anyReserved) {
    return NextResponse.json({ status: "pending" });
  }
  return NextResponse.json({ status: "expired" });
}

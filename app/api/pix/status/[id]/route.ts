import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/raffles";
import { syncPurchaseWithMercadoPago } from "@/lib/purchases";

export const dynamic = "force-dynamic";

// A tela do PIX consulta aqui a cada poucos segundos.
// Respostas: approved | pending | expired | unknown
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const purchase = await prisma.purchase.findUnique({ where: { id: params.id } });
  if (!purchase) return NextResponse.json({ status: "unknown" });

  let status = purchase.status;

  // Garantia extra: se o webhook ainda não chegou, pergunta direto pro Mercado Pago.
  if (status === "pending") {
    status = await syncPurchaseWithMercadoPago(purchase.id);
  }
  if (status === "pending") {
    await releaseExpiredReservations(purchase.raffleId);
    const fresh = await prisma.purchase.findUnique({ where: { id: purchase.id } });
    status = fresh?.status || status;
  }

  if (status === "paid" || status === "paid_conflict") {
    return NextResponse.json({ status: "approved", conflict: status === "paid_conflict" });
  }
  if (status === "pending") return NextResponse.json({ status: "pending" });
  return NextResponse.json({ status: "expired" });
}

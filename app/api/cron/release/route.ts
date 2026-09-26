import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReserveMinutes } from "@/lib/mercadopago";

export async function GET(req: NextRequest) {
  // Protege o endpoint de cron com um segredo simples via header ou query string.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const minutes = getReserveMinutes();
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const result = await prisma.raffleNumber.updateMany({
    where: {
      status: "reserved",
      reservedAt: { lt: cutoff },
    },
    data: {
      status: "available",
      buyerName: null,
      buyerPhone: null,
      buyerEmail: null,
      paymentId: null,
      reservedAt: null,
    },
  });

  return NextResponse.json({ released: result.count });
}

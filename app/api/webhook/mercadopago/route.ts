import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMpOrder } from "@/lib/mercadopago";

// O Mercado Pago chama essa rota quando o status de uma "order" muda (evento "order").
// Docs: https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/notifications
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = req.nextUrl;

    const orderId = body?.data?.id || url.searchParams.get("data.id");
    const type = body?.type || url.searchParams.get("type");

    if (!orderId || (type && type !== "order")) {
      return NextResponse.json({ received: true });
    }

    // Consulta a order direto na API do Mercado Pago em vez de confiar cegamente
    // no corpo da notificação, como a documentação recomenda.
    const order = await getMpOrder(String(orderId));
    const status = order.status; // processed, canceled, expired, etc.

    const numbers = await prisma.raffleNumber.findMany({
      where: { paymentId: String(orderId) },
    });

    if (numbers.length === 0) {
      return NextResponse.json({ received: true });
    }

    if (status === "processed") {
      await prisma.raffleNumber.updateMany({
        where: { paymentId: String(orderId) },
        data: { status: "sold", soldAt: new Date() },
      });
    } else if (status === "canceled" || status === "expired") {
      await prisma.raffleNumber.updateMany({
        where: { paymentId: String(orderId), status: "reserved" },
        data: {
          status: "available",
          buyerName: null,
          buyerPhone: null,
          buyerEmail: null,
          paymentId: null,
          reservedAt: null,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erro no webhook Mercado Pago:", err);
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";

// O Mercado Pago chama essa rota quando o status de um pagamento muda.
// Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = req.nextUrl;

    // O MP manda o id do pagamento tanto no body quanto na query string,
    // dependendo do tipo de notificação (webhooks x IPN antigo).
    const paymentId =
      body?.data?.id ||
      url.searchParams.get("data.id") ||
      url.searchParams.get("id");

    const type = body?.type || url.searchParams.get("type");

    if (!paymentId || (type && type !== "payment")) {
      return NextResponse.json({ received: true });
    }

    const payment = await mpPayment.get({ id: String(paymentId) });
    const status = payment.status; // approved, rejected, cancelled, pending, etc.

    const numbers = await prisma.raffleNumber.findMany({
      where: { paymentId: String(paymentId) },
    });

    if (numbers.length === 0) {
      return NextResponse.json({ received: true });
    }

    if (status === "approved") {
      await prisma.raffleNumber.updateMany({
        where: { paymentId: String(paymentId) },
        data: { status: "sold", soldAt: new Date() },
      });
    } else if (status === "rejected" || status === "cancelled") {
      await prisma.raffleNumber.updateMany({
        where: { paymentId: String(paymentId), status: "reserved" },
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
    // Retorna 200 mesmo em erro pra evitar reenvio infinito do MP em casos não recuperáveis;
    // o erro fica logado pra investigação.
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  // Alguns testes do painel do MP fazem GET pra validar a URL.
  return NextResponse.json({ ok: true });
}

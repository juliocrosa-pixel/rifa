import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMpOrder } from "@/lib/mercadopago";
import { applyOrderToPurchase } from "@/lib/purchases";

export const dynamic = "force-dynamic";

// O Mercado Pago chama essa rota quando o status de uma order muda (evento "order").
// Sempre consultamos a order direto na API em vez de confiar no corpo da notificação.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = req.nextUrl;

    const orderId = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    const type = body?.type || url.searchParams.get("type") || url.searchParams.get("topic");

    if (!orderId || (type && type !== "order")) {
      return NextResponse.json({ received: true });
    }

    const order = await getMpOrder(String(orderId));

    let purchaseId = order.external_reference || null;
    if (!purchaseId || !(await prisma.purchase.findUnique({ where: { id: purchaseId } }))) {
      const byOrder = await prisma.purchase.findFirst({ where: { mpOrderId: String(orderId) } });
      purchaseId = byOrder?.id || null;
    }

    if (!purchaseId) {
      if (order.status === "processed") {
        console.error("ATENÇÃO: pagamento aprovado sem compra correspondente. Order:", orderId);
      }
      return NextResponse.json({ received: true });
    }

    await applyOrderToPurchase(purchaseId, order);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erro no webhook Mercado Pago:", err);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

import { prisma } from "@/lib/prisma";
import { getMpOrder, isOrderDead, isOrderPaid, MpOrder } from "@/lib/mercadopago";

// Aplica no banco o resultado de uma order do Mercado Pago.
// Usado pelo webhook e também pela tela do comprador (como garantia, caso o webhook atrase).
export async function applyOrderToPurchase(purchaseId: string, order: MpOrder): Promise<string> {
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return "unknown";

  if (isOrderPaid(order)) {
    if (purchase.status === "paid") return "paid";

    const now = new Date();
    // 1) Números ainda reservados pra essa compra -> vendidos
    await prisma.ticket.updateMany({
      where: { purchaseId: purchase.id, status: "reserved" },
      data: { status: "sold", soldAt: now },
    });

    // 2) Se algum número tinha sido liberado (pagamento chegou atrasado), tenta pegar de volta
    let soldCount = await prisma.ticket.count({
      where: { purchaseId: purchase.id, status: "sold" },
    });
    if (soldCount < purchase.numbers.length) {
      await prisma.ticket.updateMany({
        where: {
          raffleId: purchase.raffleId,
          number: { in: purchase.numbers },
          status: "available",
        },
        data: {
          status: "sold",
          soldAt: now,
          purchaseId: purchase.id,
          buyerName: purchase.buyerName,
          buyerPhone: purchase.buyerPhone,
          buyerEmail: purchase.buyerEmail,
          reservedAt: null,
        },
      });
      soldCount = await prisma.ticket.count({
        where: { purchaseId: purchase.id, status: "sold" },
      });
    }

    const finalStatus = soldCount >= purchase.numbers.length ? "paid" : "paid_conflict";
    if (finalStatus === "paid_conflict") {
      console.error(
        "ATENÇÃO: pagamento aprovado mas nem todos os números estavam livres. Compra:",
        purchase.id
      );
    }
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: finalStatus, paidAt: now, mpOrderId: purchase.mpOrderId || order.id },
    });
    return finalStatus;
  }

  if (isOrderDead(order)) {
    if (purchase.status === "pending") {
      await releasePurchaseTickets(purchase.id);
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "expired" },
      });
      return "expired";
    }
    return purchase.status;
  }

  return purchase.status;
}

export async function releasePurchaseTickets(purchaseId: string) {
  await prisma.ticket.updateMany({
    where: { purchaseId, status: "reserved" },
    data: {
      status: "available",
      buyerName: null,
      buyerPhone: null,
      buyerEmail: null,
      purchaseId: null,
      reservedAt: null,
    },
  });
}

// Consulta o Mercado Pago e atualiza a compra. Retorna o status final da compra.
export async function syncPurchaseWithMercadoPago(purchaseId: string): Promise<string> {
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return "unknown";
  if (purchase.status !== "pending" || !purchase.mpOrderId) return purchase.status;
  try {
    const order = await getMpOrder(purchase.mpOrderId);
    return await applyOrderToPurchase(purchase.id, order);
  } catch (e) {
    console.error("Falha ao consultar order no Mercado Pago:", e);
    return purchase.status;
  }
}

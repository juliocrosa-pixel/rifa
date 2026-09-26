import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { cancelMpOrder, createMpOrder } from "@/lib/mercadopago";
import {
  getReserveMinutes,
  MAX_NUMBERS_PER_PURCHASE,
  releaseExpiredReservations,
} from "@/lib/raffles";
import { releasePurchaseTickets } from "@/lib/purchases";
import { normalizePhone } from "@/lib/format";

export const dynamic = "force-dynamic";

// Fluxo: 1) reserva os números  2) cria o PIX no Mercado Pago  3) se algo der errado, desfaz tudo.
export async function POST(req: NextRequest) {
  let purchaseId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const raffleId = parseInt(String(body.raffleId || ""), 10);
    const rawNumbers: unknown[] = Array.isArray(body.numbers) ? body.numbers : [];
    const name = String(body.name || "").trim().slice(0, 120);
    const phone = normalizePhone(String(body.phone || ""));
    const email = String(body.email || "").trim().toLowerCase().slice(0, 160);

    const numbers = Array.from(
      new Set(rawNumbers.map((n) => parseInt(String(n), 10)).filter((n) => Number.isInteger(n)))
    ).sort((a, b) => a - b);

    if (!raffleId) {
      return NextResponse.json({ error: "Rifa inválida." }, { status: 400 });
    }
    if (numbers.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos um número." }, { status: 400 });
    }
    if (numbers.length > MAX_NUMBERS_PER_PURCHASE) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_NUMBERS_PER_PURCHASE} números por compra.` },
        { status: 400 }
      );
    }
    if (name.length < 3) {
      return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
    }
    if (phone.length < 10 || phone.length > 11) {
      return NextResponse.json({ error: "WhatsApp inválido. Use DDD + número." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle || raffle.status !== "active") {
      return NextResponse.json({ error: "Esta rifa não está mais à venda." }, { status: 409 });
    }
    if (numbers.some((n) => n < 1 || n > raffle.totalNumbers)) {
      return NextResponse.json({ error: "Número fora da rifa." }, { status: 400 });
    }

    await releaseExpiredReservations(raffleId);

    const amountCents = numbers.length * raffle.priceCents;
    purchaseId = randomUUID();

    await prisma.purchase.create({
      data: {
        id: purchaseId,
        raffleId,
        numbers,
        buyerName: name,
        buyerPhone: phone,
        buyerEmail: email,
        amountCents,
        status: "pending",
      },
    });

    // 1) Reserva — só pega números que ainda estão disponíveis
    const reserved = await prisma.ticket.updateMany({
      where: { raffleId, number: { in: numbers }, status: "available" },
      data: {
        status: "reserved",
        buyerName: name,
        buyerPhone: phone,
        buyerEmail: email,
        purchaseId,
        reservedAt: new Date(),
      },
    });

    if (reserved.count !== numbers.length) {
      await releasePurchaseTickets(purchaseId);
      await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "failed" } });
      return NextResponse.json(
        { error: "Alguém acabou de pegar um desses números. Escolha outro e tente de novo.", conflict: true },
        { status: 409 }
      );
    }

    // 2) PIX no Mercado Pago
    const minutes = getReserveMinutes();
    let orderId: string | null = null;
    try {
      const order = await createMpOrder({
        amountCents,
        description: `${raffle.title} - números ${numbers.join(", ")}`,
        payerEmail: email,
        externalReference: purchaseId,
        expirationMinutes: minutes,
      });
      orderId = order.id;

      const payment = order.transactions?.payments?.[0];
      const qrCodeBase64 = payment?.payment_method?.qr_code_base64;
      const copiaECola = payment?.payment_method?.qr_code;

      if (!qrCodeBase64 || !copiaECola) {
        console.error("Order sem QR code:", JSON.stringify(order));
        throw new Error("SEM_QR");
      }

      await prisma.purchase.update({ where: { id: purchaseId }, data: { mpOrderId: order.id } });

      return NextResponse.json({
        purchaseId,
        qrCodeBase64,
        copiaECola,
        amountCents,
        expiresAt: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
      });
    } catch (mpErr: any) {
      // 3) Deu errado: cancela o PIX (se chegou a ser criado) e solta os números
      console.error("Erro ao criar PIX:", mpErr, mpErr?.mpResponse);
      if (orderId) await cancelMpOrder(orderId);
      await releasePurchaseTickets(purchaseId);
      await prisma.purchase.update({
        where: { id: purchaseId },
        data: { status: "failed", mpOrderId: orderId },
      });
      return NextResponse.json(
        { error: "O Mercado Pago não conseguiu gerar o PIX agora. Tente de novo em instantes." },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error("Erro inesperado ao criar PIX:", err);
    if (purchaseId) {
      try {
        await releasePurchaseTickets(purchaseId);
        await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "failed" } });
      } catch {}
    }
    return NextResponse.json(
      { error: "Erro ao gerar o PIX. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}

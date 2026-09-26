import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPayment, getRafflePrice } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const numbers: number[] = Array.isArray(body.numbers) ? body.numbers : [];
    const name: string = (body.name || "").trim();
    const phone: string = (body.phone || "").trim();
    const email: string = (body.email || "").trim();

    if (numbers.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos um número." }, { status: 400 });
    }
    if (!name || !phone || !email) {
      return NextResponse.json({ error: "Preencha nome, WhatsApp e e-mail." }, { status: 400 });
    }

    // Confere que todos os números ainda estão disponíveis
    const existing = await prisma.raffleNumber.findMany({
      where: { id: { in: numbers } },
    });
    const unavailable = existing.filter((n) => n.status !== "available");
    if (unavailable.length > 0 || existing.length !== numbers.length) {
      return NextResponse.json(
        { error: "Um ou mais números selecionados não estão mais disponíveis." },
        { status: 409 }
      );
    }

    const price = getRafflePrice();
    const total = Math.round(numbers.length * price * 100) / 100;

    const baseUrl = process.env.BASE_URL || req.nextUrl.origin;

    const payment = await mpPayment.create({
      body: {
        transaction_amount: total,
        description: `Rifa - números ${numbers.join(", ")}`,
        payment_method_id: "pix",
        payer: {
          email,
          first_name: name.split(" ")[0],
          last_name: name.split(" ").slice(1).join(" ") || "-",
        },
        notification_url: `${baseUrl}/api/webhook/mercadopago`,
      },
    });

    const paymentId = String(payment.id);
    const transactionData = payment.point_of_interaction?.transaction_data;

    if (!transactionData?.qr_code_base64 || !transactionData?.qr_code) {
      return NextResponse.json(
        { error: "Mercado Pago não retornou o QR code do PIX." },
        { status: 502 }
      );
    }

    // Reserva os números com o paymentId, em transação pra evitar corrida
    await prisma.$transaction(
      numbers.map((id) =>
        prisma.raffleNumber.update({
          where: { id },
          data: {
            status: "reserved",
            buyerName: name,
            buyerPhone: phone,
            buyerEmail: email,
            paymentId,
            reservedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      paymentId,
      qrCodeBase64: transactionData.qr_code_base64,
      copiaECola: transactionData.qr_code,
    });
  } catch (err: any) {
    console.error("Erro ao criar PIX:", err);
    return NextResponse.json(
      { error: "Erro ao gerar o PIX. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createMpOrder, getRafflePrice } from "@/lib/mercadopago";

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
    const externalReference = randomUUID();

    const order = await createMpOrder({
      amount: total,
      description: `Rifa - números ${numbers.join(", ")}`,
      payerEmail: email,
      externalReference,
    });

    const payment = order.transactions?.payments?.[0];
    const qrCodeBase64 = payment?.payment_method?.qr_code_base64;
    const copiaECola = payment?.payment_method?.qr_code;

    if (!qrCodeBase64 || !copiaECola) {
      console.error("Order sem QR code:", JSON.stringify(order));
      return NextResponse.json(
        { error: "Mercado Pago não retornou o QR code do PIX." },
        { status: 502 }
      );
    }

    // Guardamos o id da ORDER (não do pagamento individual) como referência,
    // já que é essa que o webhook usa para consultar o status.
    const paymentId = order.id;

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
      qrCodeBase64,
      copiaECola,
    });
  } catch (err: any) {
    console.error("Erro ao criar PIX:", err, err?.mpResponse);
    return NextResponse.json(
      { error: "Erro ao gerar o PIX. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}

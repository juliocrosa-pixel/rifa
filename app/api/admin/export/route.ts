import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRafflePrice } from "@/lib/mercadopago";

export async function GET() {
  const sold = await prisma.raffleNumber.findMany({
    where: { status: "sold" },
    orderBy: { id: "asc" },
  });

  const price = getRafflePrice();

  const header = "numero,nome,whatsapp,email,valor,pago_em,payment_id";
  const rows = sold.map((n) =>
    [
      n.id,
      (n.buyerName || "").replace(/,/g, " "),
      (n.buyerPhone || "").replace(/,/g, " "),
      (n.buyerEmail || "").replace(/,/g, " "),
      price.toFixed(2),
      n.soldAt ? n.soldAt.toISOString() : "",
      n.paymentId || "",
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=rifa-vendas.csv",
    },
  });
}

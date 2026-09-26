import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPhone, padNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Planilha (CSV) com os números vendidos de uma rifa: /api/admin/export?raffle=ID
export async function GET(req: NextRequest) {
  const raffleId = parseInt(req.nextUrl.searchParams.get("raffle") || "", 10);
  const raffle = raffleId ? await prisma.raffle.findUnique({ where: { id: raffleId } }) : null;
  if (!raffle) return NextResponse.json({ error: "Rifa não encontrada." }, { status: 404 });

  const sold = await prisma.ticket.findMany({
    where: { raffleId, status: "sold" },
    orderBy: { number: "asc" },
  });

  // ";" como separador abre certinho no Excel em português
  const header = ["numero", "nome", "whatsapp", "email", "valor", "pago_em"].join(";");
  const rows = sold.map((t) =>
    [
      padNumber(t.number, raffle.totalNumbers),
      t.buyerName,
      t.buyerPhone ? formatPhone(t.buyerPhone) : "",
      t.buyerEmail,
      (raffle.priceCents / 100).toFixed(2).replace(".", ","),
      t.soldAt ? t.soldAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "",
    ]
      .map(csvCell)
      .join(";")
  );

  const csv = "﻿" + [header, ...rows].join("\n");
  const safeTitle = raffle.title.replace(/[^\w-]+/g, "-").toLowerCase();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=vendas-${safeTitle || raffle.id}.csv`,
    },
  });
}

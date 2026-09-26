import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SETUP_SQL } from "@/lib/setup-sql";
import { saveSettings } from "@/lib/raffles";
import { normalizePhone, parsePriceToCents } from "@/lib/format";

export const dynamic = "force-dynamic";

// Configuração do banco. Acesse pelo navegador depois de cada atualização grande do site:
// https://SEU-SITE.vercel.app/api/setup?secret=SEU_SETUP_SECRET
// Cria as tabelas que faltarem e, na primeira vez, traz a rifa antiga (tabela RaffleNumber)
// pro sistema novo de várias rifas. Pode chamar de novo sem medo: não duplica nada.
export async function GET(req: NextRequest) {
  const secret = process.env.SETUP_SECRET;
  const provided = req.nextUrl.searchParams.get("secret");

  if (!secret) {
    return NextResponse.json(
      { error: "Configure a variável de ambiente SETUP_SECRET antes de usar este endpoint." },
      { status: 400 }
    );
  }
  if (provided !== secret) {
    return NextResponse.json({ error: "Segredo inválido." }, { status: 401 });
  }

  const steps: string[] = [];

  try {
    for (const sql of SETUP_SQL) {
      await prisma.$executeRawUnsafe(sql);
    }
    steps.push("Tabelas do sistema de várias rifas verificadas/criadas.");

    const raffleCount = await prisma.raffle.count();
    if (raffleCount > 0) {
      steps.push(`Já existem ${raffleCount} rifa(s) cadastrada(s) — nada foi migrado de novo.`);
      return NextResponse.json({ ok: true, steps });
    }

    // Existe a tabela antiga?
    const oldTable = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT to_regclass('"RaffleNumber"') IS NOT NULL AS "exists";`
    );
    if (!oldTable?.[0]?.exists) {
      steps.push("Nenhuma rifa antiga encontrada. Crie sua primeira rifa no painel /admin.");
      return NextResponse.json({ ok: true, steps });
    }

    const oldRows = await prisma.$queryRawUnsafe<
      {
        id: number;
        status: string;
        buyerName: string | null;
        buyerPhone: string | null;
        buyerEmail: string | null;
        soldAt: Date | null;
      }[]
    >(`SELECT "id", "status", "buyerName", "buyerPhone", "buyerEmail", "soldAt" FROM "RaffleNumber" ORDER BY "id";`);

    if (oldRows.length === 0) {
      steps.push("Tabela antiga vazia. Crie sua primeira rifa no painel /admin.");
      return NextResponse.json({ ok: true, steps });
    }

    const title = process.env.RAFFLE_TITLE || "Minha primeira rifa";
    const priceCents = parsePriceToCents(process.env.RAFFLE_PRICE || "10") || 1000;
    const total = oldRows.length;

    const raffle = await prisma.raffle.create({
      data: {
        title,
        prize: "",
        priceCents,
        totalNumbers: total,
        status: "active",
      },
    });

    const chunk = 1000;
    for (let i = 0; i < oldRows.length; i += chunk) {
      await prisma.ticket.createMany({
        data: oldRows.slice(i, i + chunk).map((r) => {
          const sold = r.status === "sold";
          return {
            raffleId: raffle.id,
            number: Number(r.id),
            status: sold ? "sold" : "available",
            buyerName: sold ? r.buyerName : null,
            buyerPhone: sold && r.buyerPhone ? normalizePhone(r.buyerPhone) : null,
            buyerEmail: sold && r.buyerEmail ? r.buyerEmail.toLowerCase() : null,
            soldAt: sold ? r.soldAt || new Date() : null,
          };
        }),
        skipDuplicates: true,
      });
    }

    await saveSettings({ siteName: title });

    const soldCount = oldRows.filter((r) => r.status === "sold").length;
    steps.push(
      `Rifa antiga migrada: "${title}", ${total} números, ${soldCount} vendido(s), preço ${(
        priceCents / 100
      ).toFixed(2)}. Ajuste os detalhes no painel /admin.`
    );
    return NextResponse.json({ ok: true, steps });
  } catch (err: any) {
    console.error("Erro no setup:", err);
    return NextResponse.json({ ok: false, steps, error: String(err?.message || err) }, { status: 500 });
  }
}

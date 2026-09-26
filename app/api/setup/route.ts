import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint de configuração inicial. Acesse uma vez, pelo navegador, depois do primeiro deploy:
// https://SEU-SITE.vercel.app/api/setup?secret=SEU_SETUP_SECRET
// Ele cria a tabela do banco (se não existir) e popula os números de 1 até RAFFLE_TOTAL_NUMBERS
// (se ainda não tiver nenhum número cadastrado). Pode chamar de novo sem medo: ele não duplica nada.
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

  const total = parseInt(process.env.RAFFLE_TOTAL_NUMBERS || "1000", 10);
  const steps: string[] = [];

  // 1. Cria a tabela, caso ainda não exista.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RaffleNumber" (
      "id" INTEGER PRIMARY KEY,
      "status" TEXT NOT NULL DEFAULT 'available',
      "buyerName" TEXT,
      "buyerPhone" TEXT,
      "buyerEmail" TEXT,
      "paymentId" TEXT,
      "reservedAt" TIMESTAMP,
      "soldAt" TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "RaffleNumber_status_idx" ON "RaffleNumber" ("status");`
  );
  // Vários números da mesma compra compartilham o mesmo paymentId, então ele não pode ser único.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "RaffleNumber" DROP CONSTRAINT IF EXISTS "RaffleNumber_paymentId_key";`
  );
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "RaffleNumber_paymentId_key";`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "RaffleNumber_paymentId_idx" ON "RaffleNumber" ("paymentId");`
  );
  steps.push("Tabela verificada/criada.");
  steps.push("Compra de vários números de uma vez liberada (paymentId não é mais único).");

  // 2. Popula os números, só se a tabela estiver vazia.
  const existing = await prisma.raffleNumber.count();
  if (existing === 0) {
    const data = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
    const chunkSize = 500;
    for (let i = 0; i < data.length; i += chunkSize) {
      await prisma.raffleNumber.createMany({ data: data.slice(i, i + chunkSize) });
    }
    steps.push(`${total} números criados (1 a ${total}).`);
  } else {
    steps.push(`Já existiam ${existing} números — nada foi duplicado.`);
  }

  return NextResponse.json({ ok: true, steps });
}

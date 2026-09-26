import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST { active: true }  -> coloca esta rifa à venda (e pausa a que estava ativa)
// POST { active: false } -> pausa esta rifa (sai do site, mas nada é perdido)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const body = await req.json().catch(() => ({}));
  const active = body?.active !== false;

  const raffle = await prisma.raffle.findUnique({ where: { id } });
  if (!raffle) return NextResponse.json({ error: "Rifa não encontrada." }, { status: 404 });
  if (raffle.status === "finished") {
    return NextResponse.json({ error: "Rifa já sorteada." }, { status: 400 });
  }

  if (active) {
    await prisma.raffle.updateMany({
      where: { status: "active", id: { not: id } },
      data: { status: "draft" },
    });
    await prisma.raffle.update({ where: { id }, data: { status: "active" } });
  } else {
    await prisma.raffle.update({ where: { id }, data: { status: "draft" } });
  }
  return NextResponse.json({ ok: true });
}

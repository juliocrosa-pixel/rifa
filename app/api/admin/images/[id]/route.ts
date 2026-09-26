import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.raffleImage.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// Transforma esta foto na principal (primeira da lista).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const img = await prisma.raffleImage.findUnique({
    where: { id: params.id },
    select: { id: true, raffleId: true },
  });
  if (!img) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });

  const all = await prisma.raffleImage.findMany({
    where: { raffleId: img.raffleId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const ordered = [img.id, ...all.map((a) => a.id).filter((x) => x !== img.id)];
  for (let i = 0; i < ordered.length; i++) {
    await prisma.raffleImage.update({ where: { id: ordered[i] }, data: { position: i } });
  }
  return NextResponse.json({ ok: true });
}

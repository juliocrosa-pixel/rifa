import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 8;

// Recebe uma foto já reduzida pelo navegador, como data URL: { dataUrl: "data:image/jpeg;base64,..." }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const raffleId = parseInt(params.id, 10);
  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle) return NextResponse.json({ error: "Rifa não encontrada." }, { status: 404 });

  const count = await prisma.raffleImage.count({ where: { raffleId } });
  if (count >= MAX_IMAGES) {
    return NextResponse.json({ error: `Máximo de ${MAX_IMAGES} fotos por rifa.` }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(body?.dataUrl || ""));
  if (!match) return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande." }, { status: 400 });
  }

  const id = randomUUID();
  await prisma.raffleImage.create({
    data: { id, raffleId, mime: match[1], data: buffer, position: count },
  });
  return NextResponse.json({ id });
}

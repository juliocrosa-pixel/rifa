import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Entrega a foto de uma rifa. As fotos ficam guardadas no próprio banco.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const img = await prisma.raffleImage.findUnique({ where: { id: params.id } });
  if (!img) return new NextResponse("Não encontrada", { status: 404 });

  const body = new Uint8Array(img.data) as unknown as BodyInit;
  return new NextResponse(body, {
    headers: {
      "Content-Type": img.mime,
      // cada foto tem um id único e nunca muda, então pode ficar em cache por muito tempo
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

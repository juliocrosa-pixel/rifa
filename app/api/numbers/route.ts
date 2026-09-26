import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStatusString, releaseExpiredReservations } from "@/lib/raffles";

export const dynamic = "force-dynamic";

// Status dos números de uma rifa, usado pela página pra se atualizar sozinha.
// Resposta: { status: "aars..." } onde a posição 0 é o número 1.
export async function GET(req: NextRequest) {
  const raffleId = parseInt(req.nextUrl.searchParams.get("raffle") || "", 10);
  if (!raffleId) return NextResponse.json({ error: "Rifa inválida." }, { status: 400 });

  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle) return NextResponse.json({ error: "Rifa não encontrada." }, { status: 404 });

  await releaseExpiredReservations(raffleId);
  const status = await getStatusString(raffleId, raffle.totalNumbers);

  return NextResponse.json(
    { status, raffleStatus: raffle.status },
    { headers: { "Cache-Control": "no-store" } }
  );
}

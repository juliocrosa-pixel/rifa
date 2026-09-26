import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

// Lista pública dos números (só id e status), usada pela página pra se atualizar sozinha.
export async function GET() {
  await releaseExpiredReservations();
  const numbers = await prisma.raffleNumber.findMany({
    orderBy: { id: "asc" },
    select: { id: true, status: true },
  });
  return NextResponse.json(
    { numbers },
    { headers: { "Cache-Control": "no-store" } }
  );
}

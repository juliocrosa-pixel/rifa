import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/raffles";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const released = await releaseExpiredReservations();
  return NextResponse.json({ released });
}

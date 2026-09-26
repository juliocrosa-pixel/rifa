import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/raffles";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const siteName = String(body?.siteName || "").trim().slice(0, 80);
  if (siteName.length < 2) {
    return NextResponse.json({ error: "Informe o nome do site." }, { status: 400 });
  }
  await saveSettings({
    siteName,
    whatsapp: String(body?.whatsapp || "").replace(/\D/g, "").slice(0, 15),
    instagram: String(body?.instagram || "").trim().replace(/^@/, "").slice(0, 60),
  });
  return NextResponse.json({ ok: true });
}

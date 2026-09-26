import type { Metadata } from "next";
import Link from "next/link";
import RaffleClient from "@/components/RaffleClient";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";
import {
  getActiveRaffle,
  getImageIds,
  getReserveMinutes,
  getSettings,
  getStatusString,
  releaseExpiredReservations,
  serializeRaffle,
} from "@/lib/raffles";
import { formatDate, padNumber, shortName } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [settings, raffle] = await Promise.all([getSettings(), getActiveRaffle()]);
    const title = raffle ? `${raffle.title} | ${settings.siteName}` : settings.siteName;
    const description = raffle?.prize
      ? `Concorra a ${raffle.prize}! Escolha seus números e pague no PIX.`
      : "Escolha seus números, pague no PIX e concorra!";
    const images = raffle ? await getImageIds(raffle.id) : [];
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: images[0] ? [`/api/imagem/${images[0]}`] : undefined,
      },
    };
  } catch {
    return { title: "Rifa Online" };
  }
}

export default async function Home() {
  const settings = await getSettings();
  const raffle = await getActiveRaffle();

  if (!raffle) {
    const last = await prisma.raffle.findFirst({
      where: { status: "finished" },
      orderBy: { finishedAt: "desc" },
    });
    return (
      <>
        <SiteHeader siteName={settings.siteName} />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="text-6xl">🍀</p>
          <h1 className="mt-4 text-2xl font-bold">Nenhuma rifa aberta no momento</h1>
          <p className="mt-2 text-neutral-400">A próxima rifa está chegando. Fique de olho!</p>
          {last && last.winnerNumber && (
            <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-sm text-neutral-400">Último sorteio: {last.title}</p>
              <p className="mt-1 text-lg">
                🏆 Número <b className="font-mono text-amber-300">{padNumber(last.winnerNumber, last.totalNumbers)}</b>
                {last.winnerName && <> — {shortName(last.winnerName)}</>}
              </p>
              {last.finishedAt && (
                <p className="text-xs text-neutral-500">{formatDate(last.finishedAt.toISOString())}</p>
              )}
            </div>
          )}
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/ganhadores" className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/5">
              Ver ganhadores
            </Link>
            <Link href="/meus-numeros" className="rounded-xl border border-white/10 px-5 py-2.5 hover:bg-white/5">
              Meus números
            </Link>
          </div>
        </main>
        <SiteFooter {...settings} />
      </>
    );
  }

  await releaseExpiredReservations(raffle.id);
  const [status, images] = await Promise.all([
    getStatusString(raffle.id, raffle.totalNumbers),
    getImageIds(raffle.id),
  ]);

  return (
    <>
      <SiteHeader siteName={settings.siteName} />
      <RaffleClient
        raffle={serializeRaffle(raffle)}
        images={images}
        initialStatus={status}
        reserveMinutes={getReserveMinutes()}
      />
      <SiteFooter {...settings} />
    </>
  );
}

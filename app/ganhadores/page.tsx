import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/raffles";
import { formatBRL, formatDate, padNumber, shortName } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ganhadores" };

export default async function WinnersPage() {
  const settings = await getSettings();
  const raffles = await prisma.raffle.findMany({
    where: { status: "finished" },
    orderBy: { finishedAt: "desc" },
    include: { images: { select: { id: true }, orderBy: { position: "asc" }, take: 1 } },
  });

  return (
    <>
      <SiteHeader siteName={settings.siteName} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">🏆 Ganhadores</h1>
        <p className="mt-2 text-neutral-400">Todas as rifas já sorteadas.</p>

        {raffles.length === 0 ? (
          <p className="mt-10 text-center text-neutral-500">Ainda não teve nenhum sorteio.</p>
        ) : (
          <div className="mt-8 space-y-4">
            {raffles.map((r) => (
              <div key={r.id} className="flex gap-4 rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
                {r.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/imagem/${r.images[0].id}`}
                    alt={r.prize || r.title}
                    className="h-24 w-24 flex-none rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-24 flex-none place-items-center rounded-xl bg-neutral-800 text-3xl">🎁</div>
                )}
                <div className="min-w-0">
                  <p className="font-bold">{r.title}</p>
                  {r.prize && <p className="text-sm text-neutral-400">Prêmio: {r.prize}</p>}
                  {r.winnerNumber !== null && (
                    <p className="mt-2">
                      Número sorteado:{" "}
                      <b className="rounded bg-amber-400 px-2 py-0.5 font-mono text-neutral-950">
                        {padNumber(r.winnerNumber, r.totalNumbers)}
                      </b>
                    </p>
                  )}
                  <p className="mt-1 text-sm text-neutral-300">
                    {r.winnerName ? `Ganhador(a): ${shortName(r.winnerName)}` : "Número não vendido"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {r.finishedAt ? `Sorteada em ${formatDate(r.finishedAt.toISOString())}` : ""} ·{" "}
                    {formatBRL(r.priceCents)} por número
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter {...settings} />
    </>
  );
}

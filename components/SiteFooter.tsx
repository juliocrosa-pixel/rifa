import Link from "next/link";
import { whatsappLink } from "@/lib/format";

export default function SiteFooter({
  siteName,
  whatsapp,
  instagram,
}: {
  siteName: string;
  whatsapp: string;
  instagram: string;
}) {
  return (
    <footer className="mt-16 border-t border-white/5 bg-neutral-950">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-bold">{siteName}</p>
          <p className="mt-2 text-sm text-neutral-400">
            Pagamento via PIX pelo Mercado Pago. Seus números são confirmados automaticamente assim que o
            pagamento é aprovado.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-300">Links</p>
          <ul className="mt-2 space-y-1 text-sm text-neutral-400">
            <li><Link href="/" className="hover:text-white">Rifa atual</Link></li>
            <li><Link href="/meus-numeros" className="hover:text-white">Consultar meus números</Link></li>
            <li><Link href="/ganhadores" className="hover:text-white">Ganhadores anteriores</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-300">Contato</p>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            {whatsapp && (
              <a
                href={whatsappLink(whatsapp, "Olá! Tenho uma dúvida sobre a rifa.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-500"
              >
                💬 Falar no WhatsApp
              </a>
            )}
            {instagram && (
              <a
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white"
              >
                📸 @{instagram}
              </a>
            )}
            {!whatsapp && !instagram && <p className="text-neutral-500">—</p>}
          </div>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-neutral-600">
        © {new Date().getFullYear()} {siteName}
      </p>
    </footer>
  );
}

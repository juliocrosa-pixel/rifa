import Link from "next/link";

export default function SiteHeader({ siteName }: { siteName: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-neutral-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-sm text-neutral-950">
            🍀
          </span>
          <span className="truncate text-lg">{siteName}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/meus-numeros"
            className="rounded-lg px-3 py-2 text-neutral-300 hover:bg-white/5 hover:text-white"
          >
            Meus números
          </Link>
          <Link
            href="/ganhadores"
            className="hidden rounded-lg px-3 py-2 text-neutral-300 hover:bg-white/5 hover:text-white sm:block"
          >
            Ganhadores
          </Link>
        </nav>
      </div>
    </header>
  );
}

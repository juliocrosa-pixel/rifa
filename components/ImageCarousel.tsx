"use client";

import { useEffect, useState } from "react";

export default function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl border border-white/5 bg-gradient-to-br from-amber-500/20 via-neutral-900 to-emerald-500/10">
        <span className="text-7xl">🎁</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/5 bg-neutral-900">
      {images.map((id, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={`/api/imagem/${id}`}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {images.length > 1 && (
        <>
          <button
            aria-label="Foto anterior"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            ‹
          </button>
          <button
            aria-label="Próxima foto"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((id, i) => (
              <button
                key={id}
                aria-label={`Foto ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Atribuição exigida pelo TMDB onde há dados vindos dele. */
export function TmdbAttribution({ className }: { className?: string }) {
  return (
    <p className={className ?? "flex flex-wrap items-center gap-3 border-t border-rule pt-4 text-xs text-soft"}>
      {/* biome-ignore lint/performance/noImgElement: logo estático */}
      {/* eslint-disable-next-line @next/next/no-img-element -- logo estático do TMDB */}
      <img src="/brand/tmdb-logo.svg" alt="TMDB" width={92} height={12} className="h-3 w-auto" />
      <span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
    </p>
  );
}

/** Atribuição exigida pela JustWatch junto de "onde assistir". */
export function JustWatchAttribution({ link }: { link?: string | null }) {
  return (
    <p className="font-micro text-[0.6875rem] text-soft">
      Dados de onde assistir:{" "}
      <a href={link ?? "https://www.justwatch.com/br"} target="_blank" rel="noreferrer" className="underline underline-offset-3">
        JustWatch
      </a>
    </p>
  );
}

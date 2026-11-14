/** Atribuição exigida pelo OpenStreetMap quando os dados vêm de lá. */
export function OsmAttribution({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-sm text-soft"}>
      Dados de endereço e contato:{" "}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-3">
        © colaboradores do OpenStreetMap
      </a>
      . Confira e ajuste o que precisar.
    </p>
  );
}

/** Selo exigido pelo Google quando sugestões ou dados vêm do Google Maps. */
export function GoogleAttribution({ className }: { className?: string }) {
  return (
    <span className={className ?? "font-micro text-[0.6875rem] text-soft"} translate="no">
      Google Maps
    </span>
  );
}

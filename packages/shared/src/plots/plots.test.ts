import { describe, expect, it } from "vitest";
import { todayIso } from "../plates";
import {
  favoritesInputSchema,
  isRewatch,
  kindFromTmdb,
  listInputSchema,
  logInputSchema,
  tmdbImage,
} from "./index";

const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return todayIso(date);
};
const ids = (count: number) =>
  Array.from({ length: count }, (_, index) => `0000000${index}-0000-4000-8000-000000000000`.slice(-36));

describe("kindFromTmdb", () => {
  it("filme e série pelo tipo do TMDB", () => {
    expect(kindFromTmdb({ type: "movie", genreIds: [18], originalLanguage: "pt" })).toBe("filme");
    expect(kindFromTmdb({ type: "tv", genreIds: [18], originalLanguage: "en" })).toBe("serie");
  });

  it("documentário pelo gênero 99", () => {
    expect(kindFromTmdb({ type: "movie", genreIds: [99], originalLanguage: "en" })).toBe("documentario");
    expect(kindFromTmdb({ type: "tv", genreIds: [99, 10764], originalLanguage: "en" })).toBe("documentario");
  });

  it("anime é animação japonesa", () => {
    expect(kindFromTmdb({ type: "tv", genreIds: [16, 10759], originalLanguage: "ja" })).toBe("anime");
    expect(kindFromTmdb({ type: "movie", genreIds: [16], originalLanguage: "ja" })).toBe("anime");
  });

  it("animação americana continua filme", () => {
    expect(kindFromTmdb({ type: "movie", genreIds: [16, 10751], originalLanguage: "en" })).toBe("filme");
  });
});

describe("isRewatch", () => {
  it("filme visto de novo é reassistido", () => {
    expect(isRewatch([{ seasonNumber: null }], null)).toBe(true);
    expect(isRewatch([], null)).toBe(false);
  });

  it("temporada nova não é reassistida; a mesma de novo é", () => {
    expect(isRewatch([{ seasonNumber: 1 }], 2)).toBe(false);
    expect(isRewatch([{ seasonNumber: 1 }, { seasonNumber: 2 }], 1)).toBe(true);
  });
});

describe("tmdbImage", () => {
  it("monta a URL no tamanho pedido", () => {
    expect(tmdbImage("/abc.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("sem caminho não há imagem", () => {
    expect(tmdbImage(null, "w342")).toBeNull();
  });
});

describe("logInputSchema", () => {
  it("recusa data no futuro", () => {
    expect(logInputSchema.safeParse({ watchedOn: tomorrow() }).success).toBe(false);
  });

  it("recusa nota fora da meia estrela", () => {
    expect(logInputSchema.safeParse({ watchedOn: todayIso(), rating: 4.2 }).success).toBe(false);
  });

  it("aceita um registro só com a data", () => {
    const parsed = logInputSchema.parse({ watchedOn: todayIso() });
    expect(parsed).toMatchObject({ liked: false, isPrivate: false, review: "" });
    expect(parsed.rewatch).toBeUndefined();
  });
});

describe("favoritesInputSchema", () => {
  it("aceita até 4 títulos", () => {
    expect(favoritesInputSchema.safeParse({ titleIds: ids(4) }).success).toBe(true);
  });

  it("recusa 5 títulos", () => {
    expect(favoritesInputSchema.safeParse({ titleIds: ids(5) }).success).toBe(false);
  });

  it("recusa título repetido", () => {
    const [first] = ids(1);
    expect(favoritesInputSchema.safeParse({ titleIds: [first, first] }).success).toBe(false);
  });
});

describe("listInputSchema", () => {
  it("recusa lista sem nome", () => {
    expect(listInputSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});

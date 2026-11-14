/**
 * Cliente da API do TMDB (v3, autenticada com o token v4 de leitura). O token
 * só existe na API do PAP; o site nunca fala com o TMDB.
 */

export class TmdbUnavailable extends Error {
  constructor(message = "O TMDB não está disponível agora.") {
    super(message);
    this.name = "TmdbUnavailable";
  }
}

export class TmdbNotFound extends Error {
  constructor() {
    super("Título não encontrado no TMDB.");
    this.name = "TmdbNotFound";
  }
}

export type TmdbClient = {
  search: (q: string, page: number) => Promise<unknown>;
  movie: (id: number) => Promise<unknown>;
  tv: (id: number) => Promise<unknown>;
};

const BASE = "https://api.themoviedb.org/3";

export function createTmdbClient(options: { token: string; fetch?: typeof fetch; timeoutMs?: number }): TmdbClient {
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 6000;

  async function get(path: string, params: Record<string, string>): Promise<unknown> {
    const query = new URLSearchParams({ language: "pt-BR", ...params });
    let response: Response;
    try {
      response = await fetcher(`${BASE}${path}?${query}`, {
        headers: { authorization: `Bearer ${options.token}`, accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new TmdbUnavailable();
    }
    if (response.status === 404) throw new TmdbNotFound();
    if (!response.ok) throw new TmdbUnavailable(`O TMDB respondeu ${response.status}.`);
    try {
      return await response.json();
    } catch {
      throw new TmdbUnavailable("O TMDB devolveu uma resposta inválida.");
    }
  }

  return {
    search: (q, page) => get("/search/multi", { query: q, page: String(page), include_adult: "false", region: "BR" }),
    movie: (id) => get(`/movie/${id}`, { append_to_response: "credits,watch/providers" }),
    tv: (id) => get(`/tv/${id}`, { append_to_response: "aggregate_credits,watch/providers" }),
  };
}

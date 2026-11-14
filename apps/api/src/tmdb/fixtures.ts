/**
 * Respostas de exemplo da API do TMDB (formato real, dados de exemplo), para os
 * testes e para o modo local sem token. Títulos inventados para não parecer
 * avaliação de obra real.
 */
import { type FakeRoute, fakeFetch, json } from "../places/fixtures";

const NETFLIX = { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg" };
const MUBI = { provider_id: 11, provider_name: "MUBI", logo_path: "/mubi.jpg" };
const PRIME = { provider_id: 119, provider_name: "Prime Video", logo_path: "/prime.jpg" };
const APPLE = { provider_id: 2, provider_name: "Apple TV", logo_path: "/apple.jpg" };

const providers = (flatrate: object[], rent: object[] = []) => ({
  results: { BR: { link: "https://www.themoviedb.org/movie/1/watch?locale=BR", flatrate, rent, buy: [] } },
});

export const TMDB_MOVIES: Record<number, object> = {
  9001: {
    id: 9001,
    title: "A Chuva de Sábado",
    original_title: "A Chuva de Sábado",
    release_date: "2021-05-14",
    runtime: 104,
    overview: "Dois vizinhos presos no mesmo elevador durante a maior tempestade do ano.",
    poster_path: null,
    backdrop_path: null,
    original_language: "pt",
    genres: [
      { id: 18, name: "Drama" },
      { id: 35, name: "Comédia" },
    ],
    credits: {
      cast: [
        { name: "Marina Alves", character: "Clara", order: 0 },
        { name: "Tomás Reis", character: "Bento", order: 1 },
      ],
      crew: [
        { job: "Director", name: "Lia Moreira" },
        { job: "Writer", name: "Outra Pessoa" },
      ],
    },
    "watch/providers": providers([NETFLIX], [APPLE]),
  },
  9002: {
    id: 9002,
    title: "Mar de Sal",
    original_title: "Salt Sea",
    release_date: "2019-09-02",
    runtime: 92,
    overview: "Um documentário sobre as salinas que desaparecem do litoral.",
    poster_path: null,
    backdrop_path: null,
    original_language: "en",
    genres: [{ id: 99, name: "Documentário" }],
    credits: { cast: [], crew: [{ job: "Director", name: "Ada Fonseca" }] },
    "watch/providers": providers([MUBI]),
  },
  9003: {
    id: 9003,
    title: "O Último Trem",
    original_title: "The Last Train",
    release_date: "2018-03-10",
    runtime: 118,
    overview: "Um maquinista e uma cidade inteira esperando o último trem.",
    poster_path: null,
    backdrop_path: null,
    original_language: "en",
    genres: [{ id: 53, name: "Thriller" }],
    credits: { cast: [{ name: "Ivo Santos", character: "Maquinista", order: 0 }], crew: [{ job: "Director", name: "Rui Prado" }] },
    "watch/providers": providers([PRIME]),
  },
};

export const TMDB_SHOWS: Record<number, object> = {
  7001: {
    id: 7001,
    name: "Casa de Vidro",
    original_name: "Casa de Vidro",
    first_air_date: "2020-02-01",
    episode_run_time: [48],
    number_of_seasons: 3,
    overview: "Uma família, uma casa transparente e nenhum segredo por muito tempo.",
    poster_path: null,
    backdrop_path: null,
    original_language: "pt",
    genres: [{ id: 18, name: "Drama" }],
    created_by: [{ name: "Beatriz Lago" }],
    aggregate_credits: {
      cast: [
        { name: "Helena Cruz", roles: [{ character: "Vera" }], order: 0 },
        { name: "Davi Ramos", roles: [{ character: "Caio" }], order: 1 },
      ],
    },
    seasons: [
      { season_number: 0, name: "Especiais", episode_count: 0, air_date: null, poster_path: null },
      { season_number: 1, name: "Temporada 1", episode_count: 8, air_date: "2020-02-01", poster_path: null },
      { season_number: 2, name: "Temporada 2", episode_count: 8, air_date: "2021-02-01", poster_path: null },
      { season_number: 3, name: "Temporada 3", episode_count: 10, air_date: "2022-02-01", poster_path: null },
    ],
    "watch/providers": providers([NETFLIX]),
  },
  7002: {
    id: 7002,
    name: "Lâmina do Vento",
    original_name: "Kaze no Yaiba",
    first_air_date: "2019-04-06",
    episode_run_time: [24],
    number_of_seasons: 2,
    overview: "Um espadachim aprendiz atravessa o país atrás do vento que levou sua vila.",
    poster_path: null,
    backdrop_path: null,
    original_language: "ja",
    genres: [
      { id: 16, name: "Animação" },
      { id: 10759, name: "Action & Adventure" },
    ],
    created_by: [{ name: "Haru Sato" }],
    aggregate_credits: { cast: [{ name: "Ken Mori", roles: [{ character: "Tanjo" }], order: 0 }] },
    seasons: [
      { season_number: 1, name: "Temporada 1", episode_count: 26, air_date: "2019-04-06", poster_path: null },
      { season_number: 2, name: "Temporada 2", episode_count: 11, air_date: "2021-12-05", poster_path: null },
    ],
    "watch/providers": providers([]),
  },
};

const searchResults = [
  { media_type: "movie", id: 9001, title: "A Chuva de Sábado", release_date: "2021-05-14", poster_path: null, genre_ids: [18, 35], original_language: "pt" },
  { media_type: "tv", id: 7001, name: "Casa de Vidro", first_air_date: "2020-02-01", poster_path: null, genre_ids: [18], original_language: "pt" },
  { media_type: "person", id: 1, name: "Marina Alves" },
  { media_type: "movie", id: 9002, title: "Mar de Sal", release_date: "2019-09-02", poster_path: null, genre_ids: [99], original_language: "en" },
  { media_type: "tv", id: 7002, name: "Lâmina do Vento", first_air_date: "2019-04-06", poster_path: null, genre_ids: [16, 10759], original_language: "ja" },
  { media_type: "movie", id: 9003, title: "O Último Trem", release_date: "2018-03-10", poster_path: null, genre_ids: [53], original_language: "en" },
];

/** Rotas do TMDB falso: busca (filtrando pelo texto) e detalhes de filme e série. */
export const TMDB_ROUTES: FakeRoute[] = [
  {
    match: "api.themoviedb.org/3/search/multi",
    respond: ({ url }) => {
      const query = (new URL(url).searchParams.get("query") ?? "").toLowerCase();
      const results = searchResults.filter((item) => ((item as { title?: string }).title ?? (item as { name?: string }).name ?? "").toLowerCase().includes(query) || query === "*");
      return json({ page: 1, results, total_pages: 1 });
    },
  },
  {
    match: "api.themoviedb.org/3/movie/",
    respond: ({ url }) => {
      const id = Number(new URL(url).pathname.split("/").pop());
      return TMDB_MOVIES[id] ? json(TMDB_MOVIES[id]) : json({ status_code: 34 }, 404);
    },
  },
  {
    match: "api.themoviedb.org/3/tv/",
    respond: ({ url }) => {
      const id = Number(new URL(url).pathname.split("/").pop());
      return TMDB_SHOWS[id] ? json(TMDB_SHOWS[id]) : json({ status_code: 34 }, 404);
    },
  },
];

export const tmdbFakeFetch = () => fakeFetch(TMDB_ROUTES);

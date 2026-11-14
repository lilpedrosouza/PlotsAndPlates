import type { Db } from "@pap/db";
import type { AuthUser, TokenVerifier } from "./auth";
import type { PlacesService } from "./places/service";
import type { Catalog } from "./tmdb/catalog";
import type { MediaStorage } from "./storage";

export type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};

/** Tudo de que as rotas dependem, injetado para facilitar os testes. */
export type AppDeps = {
  db: Db;
  verifyToken: TokenVerifier;
  storage: MediaStorage;
  webOrigins: string[];
  /** Busca de lugares (Google como localizador + OpenStreetMap). */
  places: PlacesService;
  /** Catálogo de Plots (dados do TMDB guardados no banco). */
  tmdb: Catalog;
  /** Requisições por minuto, por usuário. */
  rateLimitPerMinute?: number;
  /** Commit em execução (curto), mostrado no /health para conferir o deploy. */
  commit?: string | null;
};

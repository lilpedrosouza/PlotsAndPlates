import type { Db } from "@pap/db";
import type { AuthUser, TokenVerifier } from "./auth";
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
  /** Requisições por minuto, por usuário. */
  rateLimitPerMinute?: number;
};

import type { ApiError } from "@pap/shared";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Erro esperado, devolvido ao cliente no formato padrão da API. */
export class ApiFailure extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiFailure";
  }

  toBody(): ApiError {
    return { error: { code: this.code, message: this.message, ...(this.fields ? { fields: this.fields } : {}) } };
  }
}

export const unauthorized = (message = "Entre na sua conta para continuar.") =>
  new ApiFailure(401, "unauthorized", message);

export const notFound = (message = "Não encontrado.") => new ApiFailure(404, "not_found", message);

export const conflict = (code: string, message: string, fields?: Record<string, string>) =>
  new ApiFailure(409, code, message, fields);

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiFailure(400, "invalid_input", message, fields);

/** Código SQLSTATE de um erro do Postgres, mesmo quando o Drizzle o embrulha. */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";

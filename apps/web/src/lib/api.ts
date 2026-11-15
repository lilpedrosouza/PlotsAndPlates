import type { ApiError } from "@pap/shared";
import { env } from "./env";
import { accessToken } from "./supabase";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const OFFLINE = "Sem conexão com o PAP agora. Confere a internet e tenta de novo.";

/** Chama a API do PAP com o token da sessão atual. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await accessToken();
  if (!token) throw new ApiRequestError(401, "unauthorized", "Entre na sua conta para continuar.");

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/v1${path}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiRequestError(0, "network", OFFLINE);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as ApiError | null)?.error;
    throw new ApiRequestError(
      response.status,
      error?.code ?? "unknown",
      error?.message ?? "Algo deu errado. Tenta de novo?",
      error?.fields,
    );
  }
  return payload as T;
}

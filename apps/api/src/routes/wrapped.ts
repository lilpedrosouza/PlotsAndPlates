import type { WrappedYears } from "@pap/shared";
import { Hono } from "hono";
import { badRequest } from "../errors";
import type { AppDeps, AppEnv } from "../types";
import { loadWrapped, wrappedYears } from "../wrapped/load";

/** PAP Wrapped: os números do ano do casal de agora, calculados na hora. */
export function wrappedRoutes({ db, storage }: Pick<AppDeps, "db" | "storage">) {
  const app = new Hono<AppEnv>();

  app.get("/wrapped", async (c) => {
    const body: WrappedYears = { years: await wrappedYears(db, c.get("user").id) };
    return c.json(body);
  });

  app.get("/wrapped/:year", async (c) => {
    const year = Number(c.req.param("year"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw badRequest("Ano inválido.");
    return c.json(await loadWrapped(db, c.get("user").id, year, storage));
  });

  return app;
}

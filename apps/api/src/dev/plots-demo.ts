/**
 * Dados de exemplo de Plots para o modo local: alguns títulos do catálogo de
 * exemplo (fictícios), registros de filme e de temporadas, um quero ver, uma
 * lista e o Top 4 da Ana. Gravados direto no banco, só em desenvolvimento.
 * (O seed de um projeto de verdade não cria Plots: os ids de exemplo
 * colidiriam com títulos reais do TMDB.)
 */
import {
  type Db,
  customLists,
  favoriteTitles,
  listItems,
  plotsWatchlist,
  seasonRatings,
  titleRatings,
  watchLogs,
} from "@pap/db";
import { eq } from "drizzle-orm";
import type { Catalog } from "../tmdb/catalog";

const daysAgo = (days: number) => {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export async function seedPlotsDemo(db: Db, catalog: Catalog, users: { ana: string; bia: string }): Promise<void> {
  if ((await db.$count(watchLogs, eq(watchLogs.userId, users.ana))) > 0) return;

  const chuva = await catalog.ensure("movie", 9001);
  const sal = await catalog.ensure("movie", 9002);
  const trem = await catalog.ensure("movie", 9003);
  const casa = await catalog.ensure("tv", 7001);
  const lamina = await catalog.ensure("tv", 7002);

  await db.insert(watchLogs).values([
    { userId: users.ana, titleId: chuva, watchedOn: daysAgo(4), rating: "4", liked: true, review: "Choramos no elevador." },
    { userId: users.ana, titleId: trem, watchedOn: daysAgo(38), rating: "3.5" },
    { userId: users.ana, titleId: casa, seasonNumber: 1, watchedOn: daysAgo(70), rating: "4" },
    { userId: users.ana, titleId: casa, seasonNumber: 2, watchedOn: daysAgo(20), rating: "4.5", liked: true },
    { userId: users.ana, titleId: lamina, seasonNumber: 1, watchedOn: daysAgo(12), rating: "5", liked: true },
    { userId: users.bia, titleId: chuva, watchedOn: daysAgo(4), rating: "3.5" },
  ]);
  await db.insert(titleRatings).values([
    { userId: users.ana, titleId: chuva, rating: "4", liked: true },
    { userId: users.ana, titleId: trem, rating: "3.5" },
    { userId: users.ana, titleId: casa, rating: "4.5", liked: true },
    { userId: users.bia, titleId: chuva, rating: "3.5" },
  ]);
  await db.insert(seasonRatings).values([
    { userId: users.ana, titleId: casa, seasonNumber: 1, rating: "4" },
    { userId: users.ana, titleId: casa, seasonNumber: 2, rating: "4.5" },
    { userId: users.ana, titleId: lamina, seasonNumber: 1, rating: "5" },
  ]);
  await db.insert(plotsWatchlist).values([
    { userId: users.ana, titleId: sal, note: "A Bia indicou" },
  ]);
  const [list] = await db
    .insert(customLists)
    .values({ ownerId: users.ana, name: "Pra dia de chuva", description: "Filmes e séries para ver de cobertor." })
    .returning({ id: customLists.id });
  if (list) {
    await db.insert(listItems).values([
      { listId: list.id, titleId: chuva, position: 0 },
      { listId: list.id, titleId: casa, position: 1 },
      { listId: list.id, titleId: sal, position: 2 },
    ]);
  }
  await db.insert(favoriteTitles).values([
    { userId: users.ana, position: 1, titleId: casa },
    { userId: users.ana, position: 2, titleId: chuva },
    { userId: users.ana, position: 3, titleId: lamina },
    { userId: users.ana, position: 4, titleId: trem },
  ]);
}

import { type Db, profiles } from "@pap/db";
import type { AchievementCounts } from "@pap/shared";
import { type SQL, eq, sql } from "drizzle-orm";
import { partnerOf } from "../couples/partner";

/**
 * Contagens de cada conquista de uma pessoa, numa consulta só (subconsultas
 * escalares sobre a linha do perfil). Roda com a conexão dona das tabelas: o
 * que conta é tudo o que a pessoa registrou, inclusive o privado.
 */
export async function achievementCounts(db: Db, userId: string, knownPartner?: string | null): Promise<AchievementCounts> {
  // Quem chama e já sabe o par (inclusive "nenhum") evita procurar de novo.
  const partner = knownPartner === undefined ? await partnerOf(db, userId) : knownPartner;
  const u = sql`${userId}::uuid`;
  const p = partner ? sql`${partner}::uuid` : sql`null::uuid`;
  // Visita no caderno da pessoa: dela ou "juntos" com ela.
  const myVisit = (alias: string) => {
    const v = sql.raw(alias);
    return sql`(${v}.user_id = ${u} or (${v}.together and ${v}.together_with = ${u}))`;
  };
  const n = (query: SQL) => sql<number>`coalesce((${query}), 0)::int`;

  const [row] = await db
    .select({
      visits: n(sql`select count(*) from visits v where ${myVisit("v")}`),
      cuisines: n(sql`select count(distinct c) from visits v join restaurants r on r.id = v.restaurant_id, unnest(r.cuisines) c where ${myVisit("v")}`),
      regular: n(sql`select max(total) from (select count(*) total from visits v where ${myVisit("v")} group by v.restaurant_id) t`),
      neighborhoods: n(
        sql`select count(distinct lower(trim(r.neighborhood))) from visits v join restaurants r on r.id = v.restaurant_id where ${myVisit("v")} and trim(r.neighborhood) <> ''`,
      ),
      desserts: n(sql`select count(*) from dish_ratings dr join dishes d on d.id = dr.dish_id where dr.user_id = ${u} and d.category = 'sobremesa'`),
      restaurants: n(sql`select count(distinct v.restaurant_id) from visits v where ${myVisit("v")}`),
      sessions: n(sql`select count(*) from watch_logs w where w.user_id = ${u}`),
      movies: n(sql`select count(distinct w.title_id) from watch_logs w join titles t on t.id = w.title_id where w.user_id = ${u} and t.kind = 'filme'`),
      marathon: n(sql`
        select max(total) from (
          select count(distinct b.season_number) total
          from watch_logs a
          join watch_logs b on b.user_id = a.user_id and b.title_id = a.title_id and b.season_number is not null
            and b.watched_on between a.watched_on and a.watched_on + 6
          where a.user_id = ${u} and a.season_number is not null
          group by a.id
        ) t`),
      documentaries: n(
        sql`select count(distinct w.title_id) from watch_logs w join titles t on t.id = w.title_id where w.user_id = ${u} and t.kind = 'documentario'`,
      ),
      favorites: n(sql`select count(*) from favorite_titles f where f.user_id = ${u}`),
      ratings: n(sql`
        select count(*) from (
          select overall from restaurant_ratings where user_id = ${u} and overall is not null
          union all select rating from title_ratings where user_id = ${u} and rating is not null
        ) t`),
      ratingAverage: sql<string | null>`(
        select avg(value) from (
          select overall value from restaurant_ratings where user_id = ${u} and overall is not null
          union all select rating from title_ratings where user_id = ${u} and rating is not null
        ) t)`,
      equal: n(sql`
        select (select count(*) from restaurant_ratings a join restaurant_ratings b on b.restaurant_id = a.restaurant_id
                  where a.user_id = ${u} and b.user_id = ${p} and a.overall = b.overall)
             + (select count(*) from dish_ratings a join dish_ratings b on b.dish_id = a.dish_id
                  where a.user_id = ${u} and b.user_id = ${p} and a.rating = b.rating)
             + (select count(*) from title_ratings a join title_ratings b on b.title_id = a.title_id
                  where a.user_id = ${u} and b.user_id = ${p} and a.rating = b.rating)`),
      strong: n(sql`
        select (select count(*) from restaurant_ratings a join restaurant_ratings b on b.restaurant_id = a.restaurant_id
                  where a.user_id = ${u} and b.user_id = ${p} and abs(a.overall - b.overall) >= 2)
             + (select count(*) from dish_ratings a join dish_ratings b on b.dish_id = a.dish_id
                  where a.user_id = ${u} and b.user_id = ${p} and abs(a.rating - b.rating) >= 2)
             + (select count(*) from title_ratings a join title_ratings b on b.title_id = a.title_id
                  where a.user_id = ${u} and b.user_id = ${p} and abs(a.rating - b.rating) >= 2)`),
      together: n(sql`
        select (select count(*) from visits v where v.together and (v.user_id = ${u} or v.together_with = ${u}))
             + (select count(distinct w.group_id) from watch_logs w where w.user_id = ${u} and w.together and w.group_id is not null)`),
    })
    .from(profiles)
    .where(eq(profiles.id, userId));

  const c = row ?? {
    visits: 0, cuisines: 0, regular: 0, neighborhoods: 0, desserts: 0, restaurants: 0, sessions: 0, movies: 0, marathon: 0,
    documentaries: 0, favorites: 0, ratings: 0, ratingAverage: null, equal: 0, strong: 0, together: 0,
  };
  return {
    "primeira-mesa": Number(c.visits),
    "volta-ao-mundo": Number(c.cuisines),
    fregues: Number(c.regular),
    "explorador-de-bairros": Number(c.neighborhoods),
    "sobremesa-sempre": Number(c.desserts),
    "caderno-cheio": Number(c.restaurants),
    "primeira-sessao": Number(c.sessions),
    cinefilo: Number(c.movies),
    maratonista: Number(c.marathon),
    documentarista: Number(c.documentaries),
    "top-4": Number(c.favorites),
    "critico-exigente": Number(c.ratings),
    "almas-gemeas": Number(c.equal),
    "juntos-sempre": Number(c.together),
    "opinioes-fortes": Number(c.strong),
    "primeiro-encontro": partner ? 1 : 0,
    criticAverage: c.ratingAverage === null ? null : Number(c.ratingAverage),
  };
}

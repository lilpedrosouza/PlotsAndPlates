/**
 * Seed de dados de exemplo num projeto Supabase de verdade.
 *
 *   SEED_PASSWORD=uma-senha pnpm db:seed
 *
 * Cria duas contas de exemplo (com e-mail já confirmado) e os perfis delas.
 * É idempotente: rodar de novo não duplica nada. Use só em ambiente de
 * desenvolvimento — as contas têm senha conhecida por quem rodou o seed.
 * (O modo local, `pnpm dev:local`, já sobe com esses mesmos dados.)
 */
import { createDb, profiles } from "@pap/db";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "../env";
import { seedPlatesDemo } from "./plates-demo";

const DEMO = [
  { email: "ana@pap.exemplo", username: "ana", displayName: "Ana Souza", bio: "Sempre pede sobremesa.", accent: "oliva", streamings: ["netflix", "mubi"] },
  { email: "bia@pap.exemplo", username: "bia", displayName: "Bia Lima", bio: "Chora em animação.", accent: "padrao", streamings: ["netflix", "prime-video"] },
];

const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) {
  console.error("Defina SEED_PASSWORD (8+ caracteres) com a senha das contas de exemplo.");
  process.exit(1);
}

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { db, close } = createDb(env.DATABASE_URL);

try {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`Não foi possível listar as contas: ${listError.message}`);

  const ids: Record<string, string> = {};
  for (const person of DEMO) {
    let userId = existing.users.find((user) => user.email === person.email)?.id;
    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({ email: person.email, password, email_confirm: true });
      if (error) throw new Error(`Não foi possível criar ${person.email}: ${error.message}`);
      userId = data.user.id;
    }
    await db
      .insert(profiles)
      .values({ id: userId, username: person.username, displayName: person.displayName, bio: person.bio, accent: person.accent, streamings: person.streamings })
      .onConflictDoNothing();
    ids[person.username] = userId;
    console.log(`ok  ${person.email}  →  @${person.username}`);
  }
  await seedPlatesDemo(db, { ana: ids.ana!, bia: ids.bia! });
  console.log("ok  restaurantes de exemplo de Plates");
  console.log("Seed concluído.");
} catch (error) {
  console.error("Seed falhou:", error);
  process.exitCode = 1;
} finally {
  await close();
}

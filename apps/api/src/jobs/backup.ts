import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BACKUPS_TO_KEEP = 4;
const BACKUP_PREFIX = "pap-";

/** Nome do arquivo de backup para uma data: pap-2026-11-14T030000Z.dump */
export function backupFileName(date: Date): string {
  const stamp = date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "");
  return `${BACKUP_PREFIX}${stamp}.dump`;
}

/**
 * Dado o que existe no bucket, devolve os arquivos que devem ser apagados para
 * sobrarem só os `keep` backups mais recentes. O nome carrega a data em ISO,
 * então a ordem alfabética é a ordem cronológica.
 */
export function backupsToDelete(fileNames: string[], keep = BACKUPS_TO_KEEP): string[] {
  return fileNames
    .filter((name) => name.startsWith(BACKUP_PREFIX) && name.endsWith(".dump"))
    .sort()
    .reverse()
    .slice(keep);
}

function runPgDump(databaseUrl: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // `public` tem os dados do app; `auth` tem as contas das quais eles dependem.
    const child = spawn(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-privileges", "--schema=public", "--schema=auth", `--file=${outputFile}`],
      { env: { ...process.env, PGDATABASE: databaseUrl }, stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(new Error(`Não foi possível executar o pg_dump: ${error.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump terminou com código ${code}: ${stderr.trim().slice(-500)}`));
    });
  });
}

/**
 * Backup semanal: `pg_dump` do banco enviado para o bucket privado, mantendo
 * os 4 arquivos mais recentes. As fotos do Storage não entram no dump.
 */
export async function runBackup(options: {
  supabase: SupabaseClient;
  databaseUrl: string;
  bucket: string;
  now?: Date;
}): Promise<{ file: string; bytes: number; deleted: string[] }> {
  const file = backupFileName(options.now ?? new Date());
  const localPath = join(tmpdir(), file);

  try {
    await runPgDump(options.databaseUrl, localPath);
    const contents = await readFile(localPath);

    const storage = options.supabase.storage.from(options.bucket);
    const upload = await storage.upload(file, contents, { contentType: "application/octet-stream", upsert: true });
    if (upload.error) throw new Error(`Falha ao enviar o backup: ${upload.error.message}`);

    const listing = await storage.list("", { limit: 1000 });
    if (listing.error) throw new Error(`Falha ao listar os backups: ${listing.error.message}`);
    const deleted = backupsToDelete(listing.data.map((entry) => entry.name));
    if (deleted.length > 0) {
      const removal = await storage.remove(deleted);
      if (removal.error) throw new Error(`Falha ao apagar backups antigos: ${removal.error.message}`);
    }

    return { file, bytes: contents.byteLength, deleted };
  } finally {
    await rm(localPath, { force: true });
  }
}

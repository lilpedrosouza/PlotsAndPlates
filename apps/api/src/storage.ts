import type { SupabaseClient } from "@supabase/supabase-js";

/** Operações de mídia de que as rotas precisam (Supabase Storage em produção). */
export type MediaStorage = {
  bucket: string;
  /** Autoriza um upload direto do navegador para `path`, sem expor chaves. */
  createSignedUpload: (path: string) => Promise<{ token: string }>;
  publicUrl: (path: string) => string;
  remove: (paths: string[]) => Promise<void>;
};

const MEDIA_MAX_BYTES = 3 * 1024 * 1024;

export function createSupabaseStorage(supabase: SupabaseClient, supabaseUrl: string, bucket: string): MediaStorage {
  return {
    bucket,
    createSignedUpload: async (path) => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
      if (error) throw new Error(`Não foi possível autorizar o upload: ${error.message}`);
      return { token: data.token };
    },
    publicUrl: (path) => `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`,
    remove: async (paths) => {
      if (paths.length === 0) return;
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw new Error(`Não foi possível remover arquivos: ${error.message}`);
    },
  };
}

/**
 * Garante que os buckets existem. `media` é público para leitura (as imagens
 * têm caminhos não adivinháveis); `backups` é privado.
 */
export async function ensureBuckets(supabase: SupabaseClient, mediaBucket: string, backupBucket: string) {
  const { data: existing, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Não foi possível listar os buckets: ${error.message}`);
  const names = new Set(existing.map((bucket) => bucket.name));

  if (!names.has(mediaBucket)) {
    const created = await supabase.storage.createBucket(mediaBucket, {
      public: true,
      fileSizeLimit: MEDIA_MAX_BYTES,
      allowedMimeTypes: ["image/webp"],
    });
    if (created.error) throw new Error(`Não foi possível criar o bucket ${mediaBucket}: ${created.error.message}`);
  }
  if (!names.has(backupBucket)) {
    const created = await supabase.storage.createBucket(backupBucket, { public: false });
    if (created.error) throw new Error(`Não foi possível criar o bucket ${backupBucket}: ${created.error.message}`);
  }
}

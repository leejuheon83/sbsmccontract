import { getSupabaseBrowserClient, isSupabaseConfigured } from './supabase/client';

const BUCKET = 'preview-temp';

/**
 * Upload a docx Blob to Supabase Storage and return a public URL
 * that Microsoft Office Online can fetch.
 */
export async function uploadPreviewBlob(blob: Blob): Promise<{ publicUrl: string; path: string }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 미설정');

  const sb = getSupabaseBrowserClient();
  const path = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.docx`;

  const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

/** Delete the temporary preview file from storage. */
export async function deletePreviewBlob(path: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getSupabaseBrowserClient();
  await sb.storage.from(BUCKET).remove([path]);
}

import type { TemplateListItem } from '../../types/managedTemplate';
import { getSupabaseBrowserClient, isSupabaseConfigured } from './client';

const TABLE = 'managed_template_catalog' as const;
const SINGLETON = 'global' as const;

/**
 * 클라우드에 저장된 관리 템플릿 목록.
 * 행이 없으면 `null`(로컬 IndexedDB만 사용).
 */
export async function fetchManagedTemplateCatalog(): Promise<
  TemplateListItem[] | null
> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('items')
    .eq('singleton', SINGLETON)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const raw = data.items;
  if (!Array.isArray(raw)) return [];
  return raw as TemplateListItem[];
}

/**
 * 관리자·경영지원이 저장한 목록을 전역 행에 덮어씁니다.
 */
export async function pushManagedTemplateCatalog(
  items: TemplateListItem[],
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from(TABLE).upsert(
    {
      singleton: SINGLETON,
      items,
    },
    { onConflict: 'singleton' },
  );
  if (error) throw error;
}

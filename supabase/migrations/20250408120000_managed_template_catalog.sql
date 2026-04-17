-- ContractOS: shared managed template list (one global row, JSON payload).
-- Enables all browsers with the same Supabase project to see admin-saved templates.

create table if not exists public.managed_template_catalog (
  singleton text primary key default 'global',
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint managed_template_catalog_singleton_chk check (singleton = 'global')
);

create index if not exists managed_template_catalog_updated_at_idx
  on public.managed_template_catalog (updated_at desc);

create or replace function public.touch_managed_template_catalog_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists managed_template_catalog_touch_updated on public.managed_template_catalog;
create trigger managed_template_catalog_touch_updated
  before insert or update on public.managed_template_catalog
  for each row
  execute function public.touch_managed_template_catalog_updated_at();

alter table public.managed_template_catalog enable row level security;

-- Demo / internal: tighten before production (e.g. auth.uid() + role checks).
drop policy if exists "managed_template_catalog_allow_all_anon" on public.managed_template_catalog;
create policy "managed_template_catalog_allow_all_anon"
  on public.managed_template_catalog
  for all
  to anon, authenticated
  using (true)
  with check (true);

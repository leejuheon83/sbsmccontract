-- ContractOS: employee login & admin user list (browser anon key + RLS).
-- Run via Supabase CLI or SQL Editor (Dashboard).

create table if not exists public.app_users (
  id text primary key,
  email text not null,
  employee_id text not null,
  login_password text not null,
  name text not null,
  department text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint app_users_email_unique unique (email),
  constraint app_users_employee_id_unique unique (employee_id)
);

create index if not exists app_users_employee_id_idx on public.app_users (employee_id);

create or replace function public.touch_app_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_users_touch_updated on public.app_users;
create trigger app_users_touch_updated
  before insert or update on public.app_users
  for each row
  execute procedure public.touch_app_users_updated_at();

alter table public.app_users enable row level security;

-- WARNING: allows any holder of the anon key to read/write all rows.
-- Replace with auth.uid()-based policies before production.
drop policy if exists "app_users_allow_all_anon" on public.app_users;
create policy "app_users_allow_all_anon"
  on public.app_users
  for all
  to anon, authenticated
  using (true)
  with check (true);

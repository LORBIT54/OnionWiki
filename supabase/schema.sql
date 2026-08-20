-- OnionWiki schema (run in Supabase SQL Editor)

create table if not exists public.documents (
  id text primary key,
  title text not null default '',
  infobox jsonb not null default '{}'::jsonb,
  bodies jsonb not null default '{}'::jsonb,
  photo_url text,
  photo_path text,
  updated_at timestamptz not null default now()
);

insert into public.documents (id)
values ('main')
on conflict (id) do nothing;

grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.documents to anon, authenticated;

alter table public.documents enable row level security;

drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists "documents_update" on public.documents;

create policy "documents_select" on public.documents
  for select using (true);

create policy "documents_insert" on public.documents
  for insert with check (true);

create policy "documents_update" on public.documents
  for update using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos_select" on storage.objects;
drop policy if exists "photos_insert" on storage.objects;
drop policy if exists "photos_update" on storage.objects;
drop policy if exists "photos_delete" on storage.objects;

create policy "photos_select" on storage.objects
  for select using (bucket_id = 'photos');

create policy "photos_insert" on storage.objects
  for insert with check (bucket_id = 'photos');

create policy "photos_update" on storage.objects
  for update using (bucket_id = 'photos');

create policy "photos_delete" on storage.objects
  for delete using (bucket_id = 'photos');

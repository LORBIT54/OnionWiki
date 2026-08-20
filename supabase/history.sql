-- 문서 수정 역사 (SQL Editor에서 실행)

create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id text not null,
  title text not null default '',
  infobox jsonb not null default '{}'::jsonb,
  bodies jsonb not null default '{}'::jsonb,
  photo_url text,
  photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists document_revisions_doc_time
  on public.document_revisions (document_id, created_at desc);

grant select, insert on table public.document_revisions to anon, authenticated;

alter table public.document_revisions enable row level security;

drop policy if exists "revisions_select" on public.document_revisions;
drop policy if exists "revisions_insert" on public.document_revisions;

create policy "revisions_select" on public.document_revisions
  for select using (true);

create policy "revisions_insert" on public.document_revisions
  for insert with check (true);

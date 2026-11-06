begin;
create table public.bgm_links (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null check (length(btrim(title)) between 1 and 100),
  url text not null check (length(url) <= 2048 and url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
  archived boolean not null default false,
  unique (created_by, url)
);
alter table public.bgm_links enable row level security;
revoke all on public.bgm_links from anon, authenticated;
grant select on public.bgm_links to authenticated;
grant insert (created_by,title,url) on public.bgm_links to authenticated;
grant update (title,archived) on public.bgm_links to authenticated;
create policy "Owners read BGM links" on public.bgm_links for select to authenticated
using ((select app_private.is_camera_admin()) and created_by=(select auth.uid()));
create policy "Owners add BGM links" on public.bgm_links for insert to authenticated
with check ((select app_private.is_camera_admin()) and created_by=(select auth.uid()));
create policy "Owners edit BGM links" on public.bgm_links for update to authenticated
using ((select app_private.is_camera_admin()) and created_by=(select auth.uid()))
with check ((select app_private.is_camera_admin()) and created_by=(select auth.uid()));
comment on table public.bgm_links is '本人用の外部BGMリンク。再生中表示は各端末・タブの選択状態であり、外部プレーヤーとは連動しない。';
commit;

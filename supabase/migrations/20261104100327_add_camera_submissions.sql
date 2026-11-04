begin;

-- 管理者メールの一覧はData APIへ公開しない。登録は運用者が別途行う。
create schema app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
create table app_private.camera_admins (
  email text primary key check (email = lower(trim(email)) and length(email) > 3)
);
alter table app_private.camera_admins enable row level security;
revoke all on table app_private.camera_admins from public, anon, authenticated;

-- Authの検証済みメールと現在の利用者IDを確認するためだけに権限を昇格する。
-- 引数を受け取らず、他の利用者の情報や管理者メールは返さない。
create function app_private.is_camera_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join app_private.camera_admins a on a.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function app_private.is_camera_admin() from public, anon;
grant execute on function app_private.is_camera_admin() to authenticated;

create function public.is_camera_admin()
returns boolean
language sql stable security invoker
set search_path = ''
as $$ select app_private.is_camera_admin(); $$;
revoke all on function public.is_camera_admin() from public, anon;
grant execute on function public.is_camera_admin() to authenticated;

create table public.camera_submissions (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  youtube_url text not null check (youtube_url = 'https://www.youtube.com/watch?v=' || youtube_video_id),
  title text not null default '' check (length(title) <= 100),
  notes text not null default '' check (length(notes) <= 1000),
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index camera_submissions_created_at_idx on public.camera_submissions (created_at desc, id);
create index camera_submissions_created_by_idx on public.camera_submissions (created_by);
alter table public.camera_submissions enable row level security;
revoke all on table public.camera_submissions from public, anon, authenticated;
grant select, insert on table public.camera_submissions to authenticated;
create policy "Admins can read submissions" on public.camera_submissions
  for select to authenticated using ((select app_private.is_camera_admin()));
create policy "Admins can add submissions" on public.camera_submissions
  for insert to authenticated with check (
    (select app_private.is_camera_admin()) and created_by = (select auth.uid())
  );
comment on table public.camera_submissions is '管理者が保存する未確認のYouTube動画URL。公開用カメラには自動登録しない。';

commit;

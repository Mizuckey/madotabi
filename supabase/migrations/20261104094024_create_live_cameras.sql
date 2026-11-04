-- 初期スキーマ。既存の同名テーブルがあるプロジェクトには事前確認なしで適用しない。
begin;

create table public.live_cameras (
  id text primary key check (length(trim(id)) > 0),
  title text not null check (length(trim(title)) > 0),
  youtube_video_id text check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  prefecture_code text not null check (prefecture_code ~ '^(0[1-9]|[1-3][0-9]|4[0-7])$'),
  prefecture_name text not null check (length(trim(prefecture_name)) > 0),
  location_name text not null check (length(trim(location_name)) > 0),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  category text not null check (length(trim(category)) > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint published_camera_has_video check (not is_published or youtube_video_id is not null)
);

alter table public.live_cameras enable row level security;

-- 公開確認済みの行だけを閲覧可能にし、通常の利用者には書き込みを許可しない。
revoke all on table public.live_cameras from anon, authenticated;
grant select on table public.live_cameras to anon, authenticated;

create policy "Read published cameras"
  on public.live_cameras
  for select
  to anon, authenticated
  using (is_published = true);

comment on table public.live_cameras is '公開確認済みのYouTubeライブカメラ。初期状態は非公開。';
comment on column public.live_cameras.youtube_video_id is '実在する配信を確認後に登録。形式チェックは配信実在の保証ではない。';

commit;

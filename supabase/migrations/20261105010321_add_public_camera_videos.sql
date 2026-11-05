begin;

-- 公開に必要な情報だけを分離。候補のメモ・管理者情報はこの表に含めない。
create table public.camera_videos (
  id uuid primary key references public.camera_submissions(id),
  youtube_video_id text not null unique check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (length(trim(title)) between 1 and 120),
  published_at timestamptz not null default now()
);
create index camera_videos_published_at_idx on public.camera_videos (published_at desc, id);
alter table public.camera_videos enable row level security;
revoke all on table public.camera_videos from public, anon, authenticated;
grant select on table public.camera_videos to anon, authenticated;
grant insert, update, delete on table public.camera_videos to authenticated;
create policy "Anyone can read published video metadata" on public.camera_videos
  for select to anon, authenticated using (true);
create policy "Admins manage published videos" on public.camera_videos
  for all to authenticated using ((select app_private.is_camera_admin()))
  with check ((select app_private.is_camera_admin()));

create function public.publish_camera_submission(submission_id uuid)
returns void
language plpgsql security invoker
set search_path = ''
as $$
begin
  if not (select app_private.is_camera_admin()) then
    raise exception 'Admin permission required' using errcode = '42501';
  end if;
  insert into public.camera_videos (id, youtube_video_id, title)
    select s.id, s.youtube_video_id, coalesce(nullif(trim(s.title), ''), 'YouTube動画 ' || s.youtube_video_id)
    from public.camera_submissions s where s.id = submission_id
    on conflict (id) do update set youtube_video_id = excluded.youtube_video_id, title = excluded.title;
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.publish_camera_submission(uuid) from public, anon;
grant execute on function public.publish_camera_submission(uuid) to authenticated;
comment on table public.camera_videos is '管理者が明示的に公開したYouTube動画のメタデータのみ。配信状態は別途確認が必要。';

commit;

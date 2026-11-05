begin;
create table public.channel_watches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  channel_ref text not null check (length(channel_ref) between 3 and 110),
  channel_url text not null check (channel_url like 'https://www.youtube.com/%' and length(channel_url) <= 2048),
  channel_title text not null check (length(btrim(channel_title)) between 1 and 200),
  channel_id text check (channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  enabled boolean not null default true,
  last_attempt_at timestamptz,
  last_checked_at timestamptz,
  last_error boolean not null default false,
  live_videos jsonb not null default '[]'::jsonb check (jsonb_typeof(live_videos) = 'array' and jsonb_array_length(live_videos) <= 5),
  check_token uuid,
  unique (created_by, channel_ref)
);
alter table public.channel_watches enable row level security;
revoke all on public.channel_watches from anon, authenticated;
grant select on public.channel_watches to authenticated;
grant insert (created_by,channel_ref,channel_url,channel_title) on public.channel_watches to authenticated;
grant update (enabled) on public.channel_watches to authenticated;
create policy "Owners read watched channels" on public.channel_watches for select to authenticated
using ((select app_private.is_camera_admin()) and created_by = (select auth.uid()));
create policy "Owners add watched channels" on public.channel_watches for insert to authenticated
with check ((select app_private.is_camera_admin()) and created_by = (select auth.uid()));
create policy "Owners enable watched channels" on public.channel_watches for update to authenticated
using ((select app_private.is_camera_admin()) and created_by = (select auth.uid()))
with check ((select app_private.is_camera_admin()) and created_by = (select auth.uid()));

create function app_private.limit_channel_watches() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if not app_private.is_camera_admin() or new.created_by <> auth.uid() then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text, 1942));
  if new.enabled and (select count(*) from public.channel_watches where created_by=new.created_by and enabled and id<>new.id) >= 5 then
    raise check_violation using message='At most five watched channels';
  end if;
  return new;
end $$;
revoke all on function app_private.limit_channel_watches() from public,anon,authenticated;
create trigger limit_channel_watches before insert or update of enabled on public.channel_watches for each row execute function app_private.limit_channel_watches();

-- Only these narrowly scoped helpers can write the check cache. No service-role key.
create function app_private.claim_channel_check(watch_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare token uuid := gen_random_uuid(); claimed uuid;
begin
  if auth.uid() is null or not app_private.is_camera_admin() then raise insufficient_privilege; end if;
  update public.channel_watches set last_attempt_at=now(), check_token=token
    where id=watch_id and created_by=auth.uid() and enabled
      and (last_attempt_at is null or last_attempt_at <= now()-interval '30 minutes')
    returning id into claimed;
  return case when claimed is null then null else token end;
end $$;
create function app_private.finish_channel_check(watch_id uuid, token uuid, resolved_id text, resolved_title text, videos jsonb, failed boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not app_private.is_camera_admin() then raise insufficient_privilege; end if;
  if failed is null or jsonb_typeof(videos) is distinct from 'array' or jsonb_array_length(videos)>5 then raise check_violation; end if;
  update public.channel_watches set
    channel_id=case when failed then channel_id else resolved_id end,
    channel_title=case when failed then channel_title else resolved_title end,
    live_videos=case when failed then '[]'::jsonb else videos end,
    last_checked_at=case when failed then last_checked_at else now() end,
    last_error=failed, check_token=null
  where id=watch_id and created_by=auth.uid() and check_token=token and enabled
    and last_attempt_at > now()-interval '2 minutes';
end $$;
revoke all on function app_private.claim_channel_check(uuid) from public,anon,authenticated;
revoke all on function app_private.finish_channel_check(uuid,uuid,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function app_private.claim_channel_check(uuid), app_private.finish_channel_check(uuid,uuid,text,text,jsonb,boolean) to authenticated;
create function public.claim_channel_check(watch_id uuid) returns uuid language sql security invoker set search_path='' as $$ select app_private.claim_channel_check(watch_id); $$;
create function public.finish_channel_check(watch_id uuid, token uuid, resolved_id text, resolved_title text, videos jsonb, failed boolean)
returns void language sql security invoker set search_path='' as $$ select app_private.finish_channel_check(watch_id,token,resolved_id,resolved_title,videos,failed); $$;
revoke all on function public.claim_channel_check(uuid), public.finish_channel_check(uuid,uuid,text,text,jsonb,boolean) from public,anon;
grant execute on function public.claim_channel_check(uuid), public.finish_channel_check(uuid,uuid,text,text,jsonb,boolean) to authenticated;
comment on table public.channel_watches is '本人が閲覧中のみ確認するYouTubeチャンネル。停止状態は保持し復元可能。30分の確認間隔をDBで共有する。';
commit;

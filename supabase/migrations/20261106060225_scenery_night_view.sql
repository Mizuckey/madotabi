begin;
alter table public.camera_submissions add column night_view boolean not null default false;
grant update (night_view) on public.camera_submissions to authenticated;
comment on column public.camera_submissions.night_view is 'ONなら日没後も連続再生。OFFは地点と日の出・日の入りが確認できる日中のみ。';
commit;

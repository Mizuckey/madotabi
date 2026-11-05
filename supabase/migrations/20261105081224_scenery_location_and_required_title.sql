begin;
alter table public.camera_submissions
  alter column title drop default,
  add constraint camera_submissions_title_required check (length(btrim(title)) > 0),
  add column location_name text,
  add column latitude double precision,
  add column longitude double precision,
  add constraint camera_submissions_location_complete check (
    (location_name is null and latitude is null and longitude is null)
    or (location_name is not null and length(btrim(location_name)) between 1 and 160
      and latitude is not null and latitude between -90 and 90
      and longitude is not null and longitude between -180 and 180)
  );
grant update (location_name, latitude, longitude) on public.camera_submissions to authenticated;
comment on column public.camera_submissions.location_name is '利用者が選択した天気用の地点。カメラそのものの厳密な位置とは限らない。';
commit;

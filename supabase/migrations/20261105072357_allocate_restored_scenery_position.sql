create or replace function public.set_camera_submission_deleted(submission_id uuid, is_deleted boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not (select app_private.is_camera_admin()) then raise exception 'Permission required' using errcode = '42501'; end if;
  if is_deleted is null then raise exception 'State is required' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('madotabi-scenery-list', 0));
  update public.camera_submissions set position = case when not is_deleted and deleted_at is not null then nextval('public.camera_submissions_position_seq'::regclass) else position end, deleted_at = case when is_deleted then now() else null end
  where id = submission_id and created_by = (select auth.uid());
  if not found then raise exception 'Submission not found' using errcode = 'P0002'; end if;
end;
$$;

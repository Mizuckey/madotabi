-- Supabase SQL Editor等の管理接続で手動実行する契約テスト。
-- 既存の許可済み利用者が1名以上必要。全データ変更はROLLBACKする。
-- identity sequenceの番号だけは消費され、欠番が生じる（通常のPostgresの仕様）。
begin;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select created_by from public.camera_submissions limit 1), 'role', 'authenticated'
)::text, true);
set local role authenticated;
do $$
declare ids uuid[]; reversed_ids uuid[]; first_id uuid; max_position bigint;
  test_id uuid := gen_random_uuid(); video_id text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 11);
  denied boolean := false;
begin
  select array_agg(id order by position,id) into ids from public.camera_submissions where created_by=auth.uid() and deleted_at is null;
  if coalesce(cardinality(ids),0)<2 then raise exception 'At least 2 active scenery records are required'; end if;
  first_id := ids[1];
  select array_agg(id order by n desc) into reversed_ids from unnest(ids) with ordinality t(id,n);
  perform public.reorder_camera_submissions(reversed_ids);
  if (select array_agg(id order by position,id) from public.camera_submissions where created_by=auth.uid() and deleted_at is null) <> reversed_ids then raise exception 'Order was not persisted'; end if;
  begin perform public.reorder_camera_submissions(array[first_id,first_id]); raise exception 'Invalid order accepted'; exception when serialization_failure then null; end;
  for i in 1..5 loop
    perform public.set_camera_submission_deleted(first_id,true);
    if not exists(select 1 from public.camera_submissions where id=first_id and deleted_at is not null) then raise exception 'Archive failed'; end if;
    select max(position) into max_position from public.camera_submissions where created_by=auth.uid() and deleted_at is null;
    perform public.set_camera_submission_deleted(first_id,false);
    if not exists(select 1 from public.camera_submissions where id=first_id and deleted_at is null and position>max_position) then raise exception 'Restore must append'; end if;
  end loop;
  select max(position) into max_position from public.camera_submissions where created_by=auth.uid();
  -- 検証用の動画IDは実在する配信として保存・公開しない。トランザクション末尾で破棄する。
  insert into public.camera_submissions(id,youtube_video_id,youtube_url,title,created_by)
    values(test_id,video_id,'https://www.youtube.com/watch?v='||video_id,'rollback test',auth.uid());
  if not exists(select 1 from public.camera_submissions where id=test_id and deleted_at is null and position>max_position) then raise exception 'Insert must append'; end if;
  update public.camera_submissions set title='編集の検証', notes='更新したメモ' where id=first_id;
  if not exists(select 1 from public.camera_submissions where id=first_id and title='編集の検証' and notes='更新したメモ') then raise exception 'Metadata edit failed'; end if;
  update public.camera_submissions set night_view=true where id=first_id;
  if not exists(select 1 from public.camera_submissions where id=first_id and night_view) then raise exception 'Night view save failed'; end if;
  update public.camera_submissions set location_name='東京都 / 渋谷', latitude=35.6589, longitude=139.70665 where id=first_id;
  if not exists(select 1 from public.camera_submissions where id=first_id and location_name='東京都 / 渋谷' and latitude=35.6589 and longitude=139.70665) then raise exception 'Location edit failed'; end if;
  begin update public.camera_submissions set title='   ' where id=first_id; raise exception 'Blank title accepted'; exception when check_violation then null; end;
  begin update public.camera_submissions set latitude=null where id=first_id; raise exception 'Partial location accepted'; exception when check_violation then null; end;
  begin update public.camera_submissions set latitude=91 where id=first_id; raise exception 'Invalid latitude accepted'; exception when check_violation then null; end;
  update public.camera_submissions set location_name=null, latitude=null, longitude=null where id=first_id;
  begin update public.camera_submissions set title=repeat('a',101) where id=first_id; raise exception 'Invalid title accepted'; exception when check_violation then null; end;
  begin update public.camera_submissions set youtube_url=youtube_url where id=first_id; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Unrelated column update must fail'; end if;
end $$;
rollback;

begin;
select set_config('test.scenery_id',(select id::text from public.camera_submissions limit 1),true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare denied boolean:=false; affected integer;
begin
  begin perform public.reorder_camera_submissions(array[]::uuid[]); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Non-admin reorder accepted'; end if;
  denied:=false;
  begin perform public.set_camera_submission_deleted('00000000-0000-0000-0000-000000000001',true); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Non-admin archive accepted'; end if;
  update public.camera_submissions set title='must not save' where id=current_setting('test.scenery_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Non-admin edit accepted'; end if;
  if exists(select 1 from public.camera_submissions) then raise exception 'Non-admin can read list'; end if;
end $$;
rollback;

do $$ begin
  if has_function_privilege('anon','public.reorder_camera_submissions(uuid[])','execute') or has_function_privilege('anon','public.set_camera_submission_deleted(uuid,boolean)','execute') then raise exception 'Anonymous RPC access'; end if;
end $$;

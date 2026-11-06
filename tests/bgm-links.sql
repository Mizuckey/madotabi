-- Administrative connection; fixtures are rolled back.
begin;
select set_config('request.jwt.claims',json_build_object('sub',(select created_by from public.camera_submissions limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare item_id uuid; test_url text := 'https://example.com/?bgm-contract='||gen_random_uuid()::text; denied boolean:=false;
begin
 insert into public.bgm_links(title,url) values('BGM contract fixture',test_url) returning id into item_id;
 if not exists(select 1 from public.bgm_links where id=item_id and not archived) then raise exception 'Owner cannot read BGM'; end if;
 update public.bgm_links set title='Renamed BGM',archived=true where id=item_id;
 if not exists(select 1 from public.bgm_links where id=item_id and archived and title='Renamed BGM') then raise exception 'BGM update failed'; end if;
 update public.bgm_links set archived=false where id=item_id;
 begin insert into public.bgm_links(title,url) values('Duplicate',test_url);raise exception 'Duplicate accepted';exception when unique_violation then null;end;
 begin insert into public.bgm_links(title,url) values('   ',test_url||'empty');raise exception 'Blank title accepted';exception when check_violation then null;end;
 begin insert into public.bgm_links(title,url) values('Unsafe','javascript:alert(1)');raise exception 'Unsafe URL accepted';exception when check_violation then null;end;
 begin update public.bgm_links set url='https://example.org/' where id=item_id;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'URL update granted';end if;
end $$;
rollback;
begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare denied boolean:=false; affected integer;
begin
 if exists(select 1 from public.bgm_links) then raise exception 'Non-admin can read BGM';end if;
 begin insert into public.bgm_links(title,url) values('Denied','https://example.com/denied');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin insert accepted';end if;
 update public.bgm_links set archived=true;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Non-admin update accepted';end if;
end $$;
rollback;
do $$ begin
 if has_table_privilege('anon','public.bgm_links','select') or has_table_privilege('authenticated','public.bgm_links','delete') then raise exception 'Unexpected BGM privileges';end if;
end $$;

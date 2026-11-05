-- Run through an administrative connection. Every fixture is rolled back.
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select created_by from public.camera_submissions limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare first_id uuid; token uuid; second_token uuid; count_before integer; i integer; denied boolean:=false;
begin
  select count(*) into count_before from public.channel_watches;
  if count_before <> 0 then raise exception 'Run this initial contract on an empty watched-channel collection'; end if;
  insert into public.channel_watches(channel_ref,channel_url,channel_title) values('@旅','https://www.youtube.com/@旅','Short handle');
  update public.channel_watches set enabled=false where channel_ref='@旅';
  for i in 1..5 loop
    insert into public.channel_watches(channel_ref,channel_url,channel_title)
    values('@codexcontract'||i,'https://www.youtube.com/@codexcontract'||i,'Contract test') returning id into first_id;
  end loop;
  begin
    insert into public.channel_watches(channel_ref,channel_url,channel_title) values('@codexcontract6','https://www.youtube.com/@codexcontract6','Contract test');
    raise exception 'Six enabled channels accepted';
  exception when check_violation then null; end;
  token:=public.claim_channel_check(first_id);
  if token is null then raise exception 'First check not claimed'; end if;
  second_token:=public.claim_channel_check(first_id);
  if second_token is not null then raise exception 'Cooldown bypassed'; end if;
  perform public.finish_channel_check(first_id,gen_random_uuid(),'UCaaaaaaaaaaaaaaaaaaaaaa','Wrong token','[]',false);
  if exists(select 1 from public.channel_watches where id=first_id and last_checked_at is not null) then raise exception 'Wrong token accepted'; end if;
  perform public.finish_channel_check(first_id,token,'UCaaaaaaaaaaaaaaaaaaaaaa','Checked channel','[]',false);
  if not exists(select 1 from public.channel_watches where id=first_id and channel_title='Checked channel' and last_checked_at is not null and not last_error) then raise exception 'Finish check failed'; end if;
  begin update public.channel_watches set last_attempt_at=null where id=first_id; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Client can bypass cooldown'; end if;
  update public.channel_watches set enabled=false where id=first_id;
  if public.claim_channel_check(first_id) is not null then raise exception 'Disabled check accepted'; end if;
  update public.channel_watches set enabled=true where id=first_id;
end $$;
rollback;

begin;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare denied boolean:=false;
begin
  if exists(select 1 from public.channel_watches) then raise exception 'Non-owner can read watches'; end if;
  begin perform public.claim_channel_check(gen_random_uuid()); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Non-admin check accepted'; end if;
  denied:=false;
  begin insert into public.channel_watches(channel_ref,channel_url,channel_title) values('@codexdenied','https://www.youtube.com/@codexdenied','Denied'); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Non-admin insert accepted'; end if;
end $$;
rollback;

do $$ begin
  if has_table_privilege('anon','public.channel_watches','select') or has_function_privilege('anon','public.claim_channel_check(uuid)','execute') or has_function_privilege('anon','public.finish_channel_check(uuid,uuid,text,text,jsonb,boolean)','execute') then raise exception 'Anonymous channel access'; end if;
end $$;

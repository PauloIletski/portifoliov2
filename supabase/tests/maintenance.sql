begin;
do $$
declare owner_id uuid := gen_random_uuid(); outsider uuid := gen_random_uuid(); record_id uuid; affected integer;
payload jsonb := '{"pt-BR":{"name":"Estamos construindo","launchAt":"2030-01-01T00:00:00Z","technologies":["angular","typescript"]},"en-US":{"name":"Under construction","launchAt":"2030-01-01T00:00:00Z","technologies":["angular","typescript"]}}';
begin
  delete from public.maintenance;
  insert into auth.users(id) values(owner_id),(outsider);
  insert into public.administrators(user_id) values(owner_id);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  set local role authenticated;
  insert into public.maintenance(translations) values(payload) returning id into record_id;
  if not exists(select from public.maintenance where id=record_id) then raise exception 'Admin cannot read draft'; end if;
  begin
    update public.maintenance set published=true, translations=jsonb_set(payload,'{en-US,name}','""') where id=record_id;
    raise exception 'Incomplete bilingual publication allowed';
  exception when check_violation then null; end;
  begin
    update public.maintenance set translations=jsonb_set(payload,'{en-US,launchAt}','"bad-date"') where id=record_id;
    raise exception 'Invalid countdown date allowed';
  exception when check_violation then null; end;
  begin
    insert into public.maintenance(translations) values(payload);
    raise exception 'Multiple tapumes allowed';
  exception when unique_violation then null; end;
  begin
    update public.maintenance set translations=jsonb_set(jsonb_set(payload,'{pt-BR,channels}','[{"type":"linkedin","value":"javascript:alert(1)","visible":true}]'),'{en-US,channels}','[{"type":"linkedin","value":"javascript:alert(1)","visible":true}]') where id=record_id;
    raise exception 'Unsafe social URL allowed';
  exception when check_violation then null; end;
  update public.maintenance set translations=jsonb_set(jsonb_set(payload,'{pt-BR,channels}','[{"type":"linkedin","value":"https://linkedin.com/in/example","visible":true},{"type":"whatsapp","value":"+55 (11) 99999-9999","visible":false}]'),'{en-US,channels}','[{"type":"linkedin","value":"https://linkedin.com/in/example","visible":true},{"type":"whatsapp","value":"+55 (11) 99999-9999","visible":false}]') where id=record_id;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  if exists(select from public.maintenance) then raise exception 'Outsider sees inactive tapume'; end if;
  update public.maintenance set published=true;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Outsider can activate'; end if;
  set local role anon;
  if exists(select from public.maintenance) then raise exception 'Visitor sees inactive tapume'; end if;
  begin
    insert into public.maintenance(translations) values(payload);
    raise exception 'Visitor can write';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  set local role authenticated;
  update public.maintenance set published=true where id=record_id;
  set local role anon;
  if not exists(select from public.maintenance) then raise exception 'Visitor cannot see active tapume'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  set local role authenticated;
  delete from public.maintenance;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Outsider can delete'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  delete from public.maintenance;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin cannot delete'; end if;
  reset role;
end;
$$;
rollback;

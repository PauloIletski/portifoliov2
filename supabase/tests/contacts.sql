-- Run against an isolated development database. Always rolls back test records.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  visitor_id uuid := gen_random_uuid();
  record_id uuid;
  affected integer;
  payload jsonb := '{"pt-BR":{"name":"Contato","channels":[{"type":"whatsapp","value":"+55 (11) 99999-9999","visible":true}]},"en-US":{"name":"Contact","channels":[{"type":"whatsapp","value":"+55 (11) 99999-9999","visible":true}]}}';
begin
  delete from public.contacts;
  insert into auth.users(id) values(owner_id),(visitor_id);
  insert into public.administrators(user_id) values(owner_id);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.contacts(translations,published) values(payload,false) returning id into record_id;
  if not exists(select from public.contacts where id=record_id) then raise exception 'Admin cannot read draft'; end if;
  begin
    update public.contacts set published=true, translations=jsonb_set(payload,'{en-US,name}','""') where id=record_id;
    raise exception 'Incomplete translation was published';
  exception when check_violation then null; end;
  perform set_config('request.jwt.claim.sub',visitor_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',visitor_id,'role','authenticated')::text,true);
  if exists(select from public.contacts where id=record_id) then raise exception 'Non-admin can read draft'; end if;
  begin
    insert into public.contacts(translations,published) values(payload,true);
    raise exception 'Non-admin can insert';
  exception when insufficient_privilege then null; end;
  update public.contacts set published=true where id=record_id;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Non-admin can update'; end if;
  begin
    insert into public.administrators(user_id) values(visitor_id);
    raise exception 'Non-admin can authorize self';
  exception when insufficient_privilege then null; end;
  set local role anon;
  if exists(select from public.contacts where id=record_id) then raise exception 'Anonymous can read draft'; end if;
  begin
    insert into public.contacts(translations,published) values(payload,true);
    raise exception 'Anonymous can insert';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  update public.contacts set published=true where id=record_id;
  update public.contacts set translations=jsonb_set(jsonb_set(payload,'{pt-BR,channels,0,visible}','false'),'{en-US,channels,0,visible}','false') where id=record_id;
  set local role anon;
  if not exists(select from public.contacts where id=record_id and (translations->'pt-BR'->'channels'->0->>'visible')::boolean=false) then raise exception 'Empty contact configuration was lost'; end if;
  if not exists(select from public.contacts where id=record_id) then raise exception 'Anonymous cannot read published record'; end if;
  set local role authenticated;
  delete from public.contacts where id=record_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin cannot delete'; end if;
  reset role;
  raise notice 'PASS: administrator CRUD, draft isolation, anonymous/non-admin write denial, bilingual constraint and public read';
end;
$$;
rollback;

-- Run against an isolated development database. Always rolls back test records.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  visitor_id uuid := gen_random_uuid();
  record_id uuid;
  affected integer;
  payload jsonb := '{"pt-BR":{"name":"Teste","group":"interfaces","icon":"angular"},"en-US":{"name":"Test","group":"interfaces","icon":"angular"}}';
begin
  insert into auth.users(id) values(owner_id),(visitor_id);
  insert into public.administrators(user_id) values(owner_id);
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  insert into public.skills(translations,published) values(payload,false) returning id into record_id;
  if not exists(select from public.skills where id=record_id) then raise exception 'Admin cannot read draft'; end if;
  begin
    update public.skills set published=true, translations=jsonb_set(payload,'{en-US,name}','""') where id=record_id;
    raise exception 'Incomplete translation was published';
  exception when check_violation then null; end;
  perform set_config('request.jwt.claim.sub',visitor_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',visitor_id,'role','authenticated')::text,true);
  if exists(select from public.skills where id=record_id) then raise exception 'Non-admin can read draft'; end if;
  begin
    insert into public.skills(translations,published) values(payload,true);
    raise exception 'Non-admin can insert';
  exception when insufficient_privilege then null; end;
  update public.skills set published=true where id=record_id;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Non-admin can update'; end if;
  begin
    insert into public.administrators(user_id) values(visitor_id);
    raise exception 'Non-admin can authorize self';
  exception when insufficient_privilege then null; end;
  set local role anon;
  if exists(select from public.skills where id=record_id) then raise exception 'Anonymous can read draft'; end if;
  begin
    insert into public.skills(translations,published) values(payload,true);
    raise exception 'Anonymous can insert';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  update public.skills set published=true where id=record_id;
  set local role anon;
  if not exists(select from public.skills where id=record_id) then raise exception 'Anonymous cannot read published record'; end if;
  set local role authenticated;
  delete from public.skills where id=record_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Admin cannot delete'; end if;
  reset role;
  raise notice 'PASS: administrator CRUD, draft isolation, anonymous/non-admin write denial, bilingual constraint and public read';
end;
$$;
rollback;

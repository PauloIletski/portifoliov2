create function private.valid_maintenance(translations jsonb, published boolean) returns boolean
language plpgsql immutable set search_path = '' as $$
declare locale text; payload jsonb; icon jsonb; launch text;
begin
  if jsonb_typeof(translations) is distinct from 'object' then return false; end if;
  foreach locale in array array['pt-BR','en-US'] loop
    payload := translations->locale;
    if jsonb_typeof(payload) is distinct from 'object'
      or jsonb_typeof(payload->'name') is distinct from 'string'
      or jsonb_typeof(payload->'launchAt') is distinct from 'string'
      or jsonb_typeof(payload->'technologies') is distinct from 'array' then return false; end if;
    launch := payload->>'launchAt';
    if launch <> '' then
      if launch !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' then return false; end if;
      perform launch::timestamptz;
    end if;
    if published and (length(btrim(payload->>'name'))=0 or launch='' or jsonb_array_length(payload->'technologies')=0) then return false; end if;
    for icon in select value from jsonb_array_elements(payload->'technologies') loop
      if jsonb_typeof(icon) is distinct from 'string' or (icon#>>'{}') not in ('angular','typescript','javascript','sass','material','node','api','git','supabase','motion') then return false; end if;
    end loop;
  end loop;
  return (translations->'pt-BR'->'launchAt') = (translations->'en-US'->'launchAt')
    and (translations->'pt-BR'->'technologies') = (translations->'en-US'->'technologies');
exception when others then return false;
end;
$$;
revoke all on function private.valid_maintenance(jsonb, boolean) from public;
grant execute on function private.valid_maintenance(jsonb, boolean) to anon, authenticated;
create table public.maintenance (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  published boolean not null default false,
  translations jsonb not null,
  constraint maintenance_valid check (private.valid_maintenance(translations, published))
);
create unique index one_maintenance_page on public.maintenance ((true));
alter table public.maintenance enable row level security;
revoke all on public.maintenance from anon, authenticated;
grant select on public.maintenance to anon, authenticated;
grant insert, update, delete on public.maintenance to authenticated;
create policy public_read on public.maintenance for select to anon, authenticated using (published);
create policy admin_manage on public.maintenance for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

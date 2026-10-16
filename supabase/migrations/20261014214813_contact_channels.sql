create function private.valid_contacts(translations jsonb, published boolean) returns boolean
language plpgsql immutable set search_path = '' as $$
declare locale text; payload jsonb; channel jsonb; address text; kind text; digits text;
begin
  if jsonb_typeof(translations) is distinct from 'object' then return false; end if;
  foreach locale in array array['pt-BR','en-US'] loop
    payload := translations->locale;
    if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'name') is distinct from 'string' or jsonb_typeof(payload->'channels') is distinct from 'array' then return false; end if;
    if published and length(btrim(payload->>'name'))=0 then return false; end if;
    for channel in select value from jsonb_array_elements(payload->'channels') loop
      if jsonb_typeof(channel->'type') is distinct from 'string' or jsonb_typeof(channel->'value') is distinct from 'string' or jsonb_typeof(channel->'visible') is distinct from 'boolean' then return false; end if;
      kind := channel->>'type'; address := btrim(channel->>'value');
      if kind not in ('whatsapp','linkedin','github','instagram','facebook','youtube','x','website','email') then return false; end if;
      if (channel->>'visible')::boolean or address <> '' then
        if kind='whatsapp' then
          digits := regexp_replace(address,'[^0-9]','','g');
          if address !~ '^\+?[0-9[:space:]().-]+$' or digits !~ '^[1-9][0-9]{7,14}$' then return false; end if;
        elsif kind='email' then
          if address !~ '^[^[:space:]@?&#]+@[^[:space:]@?&#]+\.[^[:space:]@?&#]+$' then return false; end if;
        elsif address !~* '^https?://[^[:space:]/@]+([/:?#][^[:space:]]*)?$' then return false;
        end if;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;
revoke all on function private.valid_contacts(jsonb,boolean) from public;
grant execute on function private.valid_contacts(jsonb,boolean) to anon,authenticated;
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  published boolean not null default false,
  translations jsonb not null,
  constraint contacts_valid check(private.valid_contacts(translations,published))
);
create unique index one_contact_profile on public.contacts ((true));
alter table public.contacts enable row level security;
revoke all on public.contacts from anon,authenticated;
grant select on public.contacts to anon,authenticated;
grant insert,update,delete on public.contacts to authenticated;
create policy public_read on public.contacts for select to anon,authenticated using (published);
create policy admin_manage on public.contacts for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

begin;
-- Preserve validation for existing tapumes and add optional social links.
alter table public.maintenance drop constraint maintenance_valid;
alter function private.valid_maintenance(jsonb, boolean) rename to valid_maintenance_base;
create function private.valid_maintenance(translations jsonb, published boolean) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if not private.valid_maintenance_base(translations, published) then return false; end if;
  if not (translations->'pt-BR' ? 'channels') and not (translations->'en-US' ? 'channels') then return true; end if;
  return private.valid_contacts(translations, published)
    and (translations->'pt-BR'->'channels') = (translations->'en-US'->'channels');
end;
$$;
revoke all on function private.valid_maintenance(jsonb, boolean) from public;
grant execute on function private.valid_maintenance(jsonb, boolean) to anon, authenticated;
alter table public.maintenance add constraint maintenance_valid check (private.valid_maintenance(translations, published));

commit;

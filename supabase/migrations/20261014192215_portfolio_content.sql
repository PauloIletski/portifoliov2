create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table public.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create unique index one_administrator on public.administrators ((true));
alter table public.administrators enable row level security;
revoke all on public.administrators from anon, authenticated;
grant select on public.administrators to authenticated;
create policy own_administrator on public.administrators for select to authenticated using (user_id = (select auth.uid()));
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.administrators where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Both languages are validated in the database, even when bypassing the UI.
create function private.valid_content(kind text, translations jsonb, published boolean) returns boolean
language plpgsql immutable set search_path = '' as $$
declare locale text; payload jsonb; key text; required_keys text[]; array_keys text[]; item jsonb;
begin
  if jsonb_typeof(translations) is distinct from 'object' then return false; end if;
  required_keys := case kind
    when 'projects' then array['name','author','mark','category','summary','collectionStack','demoRoute','demoLabel','detailsTitle']
    when 'experiences' then array['role','company','period','summary']
    when 'profiles' then array['name','role','description','descriptionMore']
    when 'skills' then array['name','group','icon'] end;
  array_keys := case kind when 'projects' then array['technologies','details'] when 'experiences' then array['highlights','technologies'] when 'profiles' then array['principles'] else array[]::text[] end;
  foreach locale in array array['pt-BR','en-US'] loop
    payload := translations->locale;
    if jsonb_typeof(payload) is distinct from 'object' then return false; end if;
    foreach key in array required_keys loop
      if jsonb_typeof(payload->key) is distinct from 'string' then return false; end if;
      if published and length(btrim(payload->>key)) = 0 then return false; end if;
    end loop;
    foreach key in array array_keys loop
      if jsonb_typeof(payload->key) is distinct from 'array' then return false; end if;
      if published and jsonb_array_length(payload->key)=0 then return false; end if;
      for item in select value from jsonb_array_elements(payload->key) loop
        if key in ('details','principles') then
          if jsonb_typeof(item->'title') is distinct from 'string' or jsonb_typeof(item->'description') is distinct from 'string' then return false; end if;
          if published and (length(btrim(item->>'title'))=0 or length(btrim(item->>'description'))=0) then return false; end if;
        elsif jsonb_typeof(item) is distinct from 'string' or (published and length(btrim(item#>>'{}'))=0) then return false;
        end if;
      end loop;
    end loop;
    if kind='projects' then
      if payload->>'demoRoute' <> '' and payload->>'demoRoute' !~* '^(/[^/]|/$|https?://)' then return false; end if;
      if payload ? 'image' then
        item := payload->'image';
        if jsonb_typeof(item->'src') is distinct from 'string' or item->>'src' !~* '^https?://' or
           jsonb_typeof(item->'width') is distinct from 'number' or jsonb_typeof(item->'height') is distinct from 'number' or
           (item->>'width')::numeric <= 0 or (item->>'height')::numeric <= 0 or
           jsonb_typeof(item->'alt') is distinct from 'string' then return false; end if;
        if published and length(btrim(item->>'alt'))=0 then return false; end if;
      end if;
    end if;
    if kind='skills' then
      if (payload->>'group') not in ('','interfaces','services','collaboration') or
         (payload->>'icon') not in ('','angular','typescript','javascript','code','sass','material','node','api','git','testing','accessibility','responsive','communication','problem','documentation','review','learning') then return false; end if;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function private.valid_content(text,jsonb,boolean) from public;
grant execute on function private.valid_content(text,jsonb,boolean) to anon, authenticated;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  published boolean not null default false,
  translations jsonb not null,
  constraint projects_valid_content check (private.valid_content('projects',translations,published))
);
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
create index projects_public_order on public.projects (position,id) where published;
create policy public_read on public.projects for select to anon, authenticated using (published);
create policy admin_manage on public.projects for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  published boolean not null default false,
  translations jsonb not null,
  constraint experiences_valid_content check (private.valid_content('experiences',translations,published))
);
alter table public.experiences enable row level security;
revoke all on public.experiences from anon, authenticated;
grant select on public.experiences to anon, authenticated;
grant insert, update, delete on public.experiences to authenticated;
create index experiences_public_order on public.experiences (position,id) where published;
create policy public_read on public.experiences for select to anon, authenticated using (published);
create policy admin_manage on public.experiences for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  published boolean not null default false,
  translations jsonb not null,
  constraint profiles_valid_content check (private.valid_content('profiles',translations,published))
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
create index profiles_public_order on public.profiles (position,id) where published;
create policy public_read on public.profiles for select to anon, authenticated using (published);
create policy admin_manage on public.profiles for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  published boolean not null default false,
  translations jsonb not null,
  constraint skills_valid_content check (private.valid_content('skills',translations,published))
);
alter table public.skills enable row level security;
revoke all on public.skills from anon, authenticated;
grant select on public.skills to anon, authenticated;
grant insert, update, delete on public.skills to authenticated;
create index skills_public_order on public.skills (position,id) where published;
create policy public_read on public.skills for select to anon, authenticated using (published);
create policy admin_manage on public.skills for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create unique index one_profile on public.profiles ((true));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-images','portfolio-images',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy portfolio_images_admin on storage.objects for all to authenticated
using (bucket_id='portfolio-images' and (select private.is_admin()))
with check (bucket_id='portfolio-images' and (select private.is_admin()));

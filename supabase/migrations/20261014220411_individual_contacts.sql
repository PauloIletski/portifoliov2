-- Convert the previous singleton collection into independently editable contacts.
-- The first channel keeps the original UUID; further channels receive new UUIDs.
begin;
drop index public.one_contact_profile;
create temporary table contact_channels_migration on commit drop as
select c.id original_id, (row_number() over(partition by c.id order by channel_index)-1)::integer channel_index, c.position + channel_index position, c.published,
  jsonb_build_object(
    'pt-BR', jsonb_build_object('name',c.translations->'pt-BR'->>'name','channels',jsonb_build_array(coalesce(c.translations->'pt-BR'->'channels'->channel_index,c.translations->'en-US'->'channels'->channel_index))),
    'en-US', jsonb_build_object('name',c.translations->'en-US'->>'name','channels',jsonb_build_array(coalesce(c.translations->'en-US'->'channels'->channel_index,c.translations->'pt-BR'->'channels'->channel_index)))
  ) translations
from public.contacts c cross join lateral generate_series(0,greatest(jsonb_array_length(c.translations->'pt-BR'->'channels'),jsonb_array_length(c.translations->'en-US'->'channels'))-1) channel_index
where length(btrim(coalesce(c.translations->'pt-BR'->'channels'->channel_index->>'value','')))>0
   or length(btrim(coalesce(c.translations->'en-US'->'channels'->channel_index->>'value','')))>0;
-- Empty legacy collections contain no individual contact to migrate.
delete from public.contacts c where not exists(select 1 from contact_channels_migration m where m.original_id=c.id);
update public.contacts c set translations=m.translations from contact_channels_migration m where m.original_id=c.id and m.channel_index=0;
insert into public.contacts(id,position,published,translations)
select gen_random_uuid(),position,published,translations from contact_channels_migration where channel_index>0;
alter table public.contacts add constraint one_channel_per_contact check(
  jsonb_array_length(translations->'pt-BR'->'channels')=1 and
  jsonb_array_length(translations->'en-US'->'channels')=1
);

commit;

-- REschedule 0003
--  * several showing-request preferences per professional
--  * personal profile link (slug), other websites, preferred map app
--  * public profile page + "connect with me" form (works without an account)
--  * client stages: future, present, past
--  * deals tied to a client, HOA flag
--  * "I've arrived", extra comments on requests, fuller showing feedback

-- ---------- Showing request preferences: pick several ----------
alter table contact_preferences add column if not exists methods contact_method[] not null default '{app}';
update contact_preferences set methods = array[preferred] where methods = '{app}' and preferred <> 'app';

-- ---------- Profile link, websites, map app ----------
alter table profiles
  add column if not exists slug text,
  add column if not exists websites jsonb not null default '[]'::jsonb,
  add column if not exists map_app text not null default 'google';
alter table profiles add constraint profiles_map_app_check check (map_app in ('google', 'apple', 'waze'));
alter table profiles add constraint profiles_websites_check check (jsonb_typeof(websites) = 'array' and jsonb_array_length(websites) <= 8);
alter table profiles add constraint profiles_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$');
create unique index if not exists profiles_slug_key on profiles (slug);

create or replace function make_slug(name text, id uuid) returns text
language sql immutable as $$
  select left(coalesce(nullif(trim(both '-' from regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g')), ''), 'pro'), 40)
         || '-' || substr(md5(id::text), 1, 4)
$$;

create or replace function set_profile_slug() returns trigger
language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then new.slug := make_slug(new.full_name, new.id); end if;
  return new;
end;
$$;
drop trigger if exists profiles_slug on profiles;
create trigger profiles_slug before insert or update on profiles for each row execute function set_profile_slug();
update profiles set slug = make_slug(full_name, id) where slug is null;

-- ---------- Clients: stages and where they came from ----------
alter table clients
  add column if not exists stage text not null default 'present',
  add column if not exists source text not null default 'manual',
  add column if not exists intent text,
  add column if not exists notes text;
alter table clients add constraint clients_stage_check check (stage in ('future', 'present', 'past'));
alter table clients add constraint clients_source_check check (source in ('manual', 'link', 'deal'));

-- Public profile card for the personal link. Only safe fields; verified licenses only.
create or replace function public_profile(p_slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', p.id, 'slug', p.slug, 'full_name', p.full_name, 'tagline', p.tagline, 'bio', p.bio,
    'phone', p.phone, 'email', p.email, 'headshot_path', p.headshot_path, 'logo_path', p.logo_path,
    'brokerage', b.name, 'websites', p.websites,
    'licenses', coalesce((select json_agg(json_build_object('profession', l.profession, 'state', l.state, 'number', l.number))
                          from licenses l where l.profile_id = p.id and l.status = 'verified'), '[]'::json)
  )
  from profiles p left join brokerages b on b.id = p.brokerage_id
  where p.slug = lower(p_slug)
    and exists (select 1 from licenses l where l.profile_id = p.id and l.status = 'verified')
$$;

-- "Connect with me": a client links themselves to a professional from the personal link or QR code.
create or replace function connect_to_pro(p_slug text, p_name text, p_phone text, p_email text, p_intent text, p_consent boolean)
returns void language plpgsql security definer set search_path = public as $$
declare pro uuid;
begin
  if not coalesce(p_consent, false) then raise exception 'Consent is required'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Add your name'; end if;
  if coalesce(p_phone, '') = '' and coalesce(p_email, '') = '' then raise exception 'Add a phone or email'; end if;
  if length(coalesce(p_phone, '')) > 30 or length(coalesce(p_email, '')) > 120 or length(coalesce(p_intent, '')) > 40 then raise exception 'Too long'; end if;
  select p.id into pro from profiles p where p.slug = lower(p_slug)
    and exists (select 1 from licenses l where l.profile_id = p.id and l.status = 'verified');
  if pro is null then raise exception 'Profile not found'; end if;
  -- Simple flood guard: at most 50 link sign-ups per professional per day.
  if (select count(*) from clients where agent_id = pro and source = 'link' and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Please try again tomorrow';
  end if;
  insert into clients (agent_id, name, phone, email, intent, stage, source)
  values (pro, trim(p_name), nullif(trim(p_phone), ''), nullif(lower(trim(p_email)), ''), nullif(p_intent, ''), 'future', 'link');
end;
$$;
revoke all on function public_profile(text) from public;
revoke all on function connect_to_pro(text, text, text, text, text, boolean) from public;
grant execute on function public_profile(text) to anon, authenticated;
grant execute on function connect_to_pro(text, text, text, text, text, boolean) to anon, authenticated;

-- ---------- Deals ----------
alter table deals
  add column if not exists client_id uuid references clients on delete set null,
  add column if not exists city text,
  add column if not exists has_hoa boolean not null default false;

-- ---------- Showings: arrival, comments, feedback ----------
alter table showing_requests
  add column if not exists comments text check (char_length(comments) <= 500),
  add column if not exists arrived_at timestamptz;

alter table showing_feedback
  add column if not exists comments text check (char_length(comments) <= 1000),
  add column if not exists questions text check (char_length(questions) <= 500),
  add column if not exists next_step text not null default 'none';
alter table showing_feedback add constraint showing_feedback_next_step_check check (next_step in ('none', 'second_showing', 'offer'));
create unique index if not exists showing_feedback_one_per_request on showing_feedback (request_id);

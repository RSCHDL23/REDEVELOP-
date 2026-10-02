-- REschedule 0004
--  * requesting agent can edit a request (new date/time goes back to Pending)
--  * running-late ETA
--  * profile: agent ID vs license in messages, home/office start points, review sites, REmember settings
--  * client home anniversaries and in-app reviews by private link

-- ---------- Showing requests ----------
alter table showing_requests add column if not exists late_eta timestamptz;

create or replace function guard_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;

  if old.listing_id is not null and is_listing_side(old.listing_id) then
    if new.requesting_agent_id <> old.requesting_agent_id or new.listing_id is distinct from old.listing_id then
      raise exception 'The home and requesting agent cannot be changed';
    end if;
    if new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
      raise exception 'Suggest a new time instead of changing the request';
    end if;
    if new.status = 'countered' and new.proposed_starts_at is null then
      raise exception 'Add the new time you are suggesting';
    end if;
    if new.status is distinct from old.status then new.decided_at := now(); end if;
    return new;
  end if;

  if old.requesting_agent_id = auth.uid() then
    if new.requesting_agent_id <> old.requesting_agent_id or new.listing_id is distinct from old.listing_id then
      raise exception 'The home and requesting agent cannot be changed';
    end if;

    -- Typed-in home: the requester keeps the record up to date.
    if old.listing_id is null then
      if new.status is distinct from old.status then new.decided_at := now(); end if;
      return new;
    end if;

    -- Accept the suggested time.
    if old.status = 'countered' and new.status = 'approved'
       and new.starts_at = old.proposed_starts_at and new.ends_at = old.proposed_ends_at then
      new.decided_at := now();
      return new;
    end if;

    -- Edit: a new date/time goes back to Pending for the listing side to answer.
    if new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
      if new.status not in ('pending') then
        raise exception 'An edited request goes back to pending';
      end if;
      new.proposed_starts_at := null;
      new.proposed_ends_at := null;
      new.response_note := null;
      new.decided_at := null;
      return new;
    end if;

    -- Cancel, comments, reminders, arrival, running late.
    if new.proposed_starts_at is distinct from old.proposed_starts_at
       or new.proposed_ends_at is distinct from old.proposed_ends_at
       or new.response_note is distinct from old.response_note then
      raise exception 'Only the listing side can suggest a time';
    end if;
    if new.status is distinct from old.status then
      if new.status <> 'cancelled' then
        raise exception 'Only the listing side can approve, decline or suggest a time';
      end if;
      new.decided_at := now();
    end if;
    return new;
  end if;

  raise exception 'Not allowed';
end;
$$;

-- ---------- Profile settings ----------
alter table profiles
  add column if not exists mls_agent_id text check (char_length(mls_agent_id) <= 30),
  add column if not exists id_in_messages text not null default 'license',
  add column if not exists home_address text check (char_length(home_address) <= 200),
  add column if not exists home_lat double precision,
  add column if not exists home_lng double precision,
  add column if not exists office_address text check (char_length(office_address) <= 200),
  add column if not exists office_lat double precision,
  add column if not exists office_lng double precision,
  add column if not exists review_links jsonb not null default '[]'::jsonb,
  add column if not exists remember_auto boolean not null default true,
  add column if not exists remember_channel text not null default 'text';
alter table profiles add constraint profiles_id_in_messages_check check (id_in_messages in ('license', 'mls_id', 'both'));
alter table profiles add constraint profiles_remember_channel_check check (remember_channel in ('text', 'email'));
alter table profiles add constraint profiles_review_links_check check (jsonb_typeof(review_links) = 'array' and jsonb_array_length(review_links) <= 8);

-- ---------- Clients: anniversaries and review links ----------
alter table clients
  add column if not exists closed_on date,                       -- home anniversary for REmember
  add column if not exists remember boolean not null default true,
  add column if not exists review_token uuid not null default gen_random_uuid(),
  add column if not exists review_requested_at timestamptz;
create unique index if not exists clients_review_token_key on clients (review_token);

-- ---------- Client reviews (from a private link; the client needs no account) ----------
create table if not exists client_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles on delete cascade,
  client_id uuid unique references clients on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 60),
  stars smallint not null check (stars between 1 and 5),
  body text check (char_length(body) <= 1500),
  created_at timestamptz not null default now()
);
alter table client_reviews enable row level security;
create policy "agents read own reviews" on client_reviews for select to authenticated using (agent_id = auth.uid());

-- Who is being reviewed, for the review page (no account needed).
create or replace function review_target(p_token uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('agent_name', p.full_name, 'slug', p.slug, 'client_first', split_part(c.name, ' ', 1),
                           'already', exists (select 1 from client_reviews r where r.client_id = c.id),
                           'review_links', p.review_links)
  from clients c join profiles p on p.id = c.agent_id
  where c.review_token = p_token
$$;

create or replace function submit_review(p_token uuid, p_name text, p_stars int, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare c clients%rowtype;
begin
  select * into c from clients where review_token = p_token;
  if not found then raise exception 'This review link is not valid'; end if;
  if p_stars not between 1 and 5 then raise exception 'Pick 1 to 5 stars'; end if;
  insert into client_reviews (agent_id, client_id, display_name, stars, body)
  values (c.agent_id, c.id, left(coalesce(nullif(trim(p_name), ''), split_part(c.name, ' ', 1)), 60), p_stars, left(nullif(trim(p_body), ''), 1500))
  on conflict (client_id) do update set stars = excluded.stars, body = excluded.body, display_name = excluded.display_name, created_at = now();
end;
$$;

-- Reviews shown on the public profile.
create or replace function public_client_reviews(p_slug text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('name', r.display_name, 'stars', r.stars, 'body', r.body, 'at', r.created_at) order by r.created_at desc), '[]'::json)
  from client_reviews r join profiles p on p.id = r.agent_id
  where p.slug = lower(p_slug)
$$;

revoke all on function review_target(uuid) from public;
revoke all on function submit_review(uuid, text, int, text) from public;
revoke all on function public_client_reviews(text) from public;
grant execute on function review_target(uuid) to anon, authenticated;
grant execute on function submit_review(uuid, text, int, text) to anon, authenticated;
grant execute on function public_client_reviews(text) to anon, authenticated;

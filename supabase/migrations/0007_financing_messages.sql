-- REschedule 0007
--  * buyer financing: pre-approval terms, proof of funds, or a budget estimate
--    (on an agent's client, and on a buyer's own profile)
--  * Messages between people who work together
--  * the notification bell remembers when you last looked

-- ---------- Financing ----------
alter table clients add column if not exists financing jsonb;
alter table profiles
  add column if not exists financing jsonb,
  add column if not exists notifications_seen_at timestamptz;
alter table clients add constraint clients_financing_check
  check (financing is null or (jsonb_typeof(financing) = 'object' and pg_column_size(financing) < 4000));
alter table profiles add constraint profiles_financing_check
  check (financing is null or (jsonb_typeof(financing) = 'object' and pg_column_size(financing) < 4000));

-- ---------- Messages ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references profiles on delete cascade,
  recipient_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_recipient_idx on messages (recipient_id, created_at desc);
create index if not exists messages_sender_idx on messages (sender_id, created_at desc);
alter table messages enable row level security;

-- True when you and `other` work together: your agent or client (through your link),
-- the other side of a showing request, or someone on one of your deals.
create or replace function works_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select other is not null and other <> auth.uid() and (
    exists (select 1 from profiles p where (p.id = auth.uid() and p.my_agent_id = other) or (p.id = other and p.my_agent_id = auth.uid()))
    or exists (
      select 1 from showing_requests r join listings l on l.id = r.listing_id
      where (r.requesting_agent_id = auth.uid() and other in (l.listing_agent_id, l.owner_id))
         or (r.requesting_agent_id = other and auth.uid() in (l.listing_agent_id, l.owner_id))
    )
    or exists (
      select 1 from deal_members a join deal_members b on a.deal_id = b.deal_id
      where a.profile_id = auth.uid() and b.profile_id = other
    )
  );
$$;
grant execute on function works_with(uuid) to authenticated;

create policy "see your messages" on messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "message people you work with" on messages for insert to authenticated
  with check (sender_id = auth.uid() and works_with(recipient_id));
create policy "recipient marks read" on messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
-- Messages can't be rewritten: the recipient can only set read_at.
revoke update on messages from authenticated;
grant update (read_at) on messages to authenticated;

-- People you can message, and how you know them.
create or replace function message_contacts()
returns table (id uuid, name text, context text)
language sql stable security definer set search_path = public as $$
  select distinct on (p.id) p.id, p.full_name, c.context
  from (
    select x.id as pid, 'Your client'::text as context, 1 as rank from profiles x where x.my_agent_id = auth.uid()
    union all
    select x.my_agent_id, 'Your agent', 1 from profiles x where x.id = auth.uid() and x.my_agent_id is not null
    union all
    select b.profile_id, initcap(replace(b.role::text, '_', ' ')) || ' · ' || d.property_address, 2
    from deal_members a join deal_members b on a.deal_id = b.deal_id join deals d on d.id = a.deal_id
    where a.profile_id = auth.uid() and b.profile_id is not null
    union all
    select l.listing_agent_id, 'Listing agent · ' || l.address, 3
    from showing_requests r join listings l on l.id = r.listing_id
    where r.requesting_agent_id = auth.uid() and l.listing_agent_id is not null
    union all
    select r.requesting_agent_id, 'Agent · showing ' || l.address, 3
    from showing_requests r join listings l on l.id = r.listing_id
    where auth.uid() in (l.listing_agent_id, l.owner_id)
  ) c
  join profiles p on p.id = c.pid
  where c.pid <> auth.uid()
  order by p.id, c.rank;
$$;
grant execute on function message_contacts() to authenticated;

-- REschedule 0002: showing request updates
--  * listing photos
--  * saved clients (buyers) for each agent
--  * requests for homes not in the system (typed-in address and listing agent)
--  * suggested new times, reminders and resends
--  * listing side can change its answer; requester can accept a suggested time

-- ---------- Listing photos ----------
alter table listings add column if not exists photo_url text;  -- MLS photo link or a file in the "listing-photos" bucket

insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true)
  on conflict (id) do nothing;
create policy "upload own listing photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Clients ----------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles on delete cascade,
  name text not null check (length(name) between 1 and 80),
  phone text,
  email text,
  pre_approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists clients_agent_idx on clients (agent_id, name);
alter table clients enable row level security;
create policy "agents manage own clients" on clients for all to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- ---------- Showing requests ----------
alter table showing_requests alter column listing_id drop not null;
alter table showing_requests
  add column if not exists client_id uuid references clients on delete set null,
  add column if not exists manual_address text,
  add column if not exists manual_agent_name text,
  add column if not exists manual_agent_phone text,
  add column if not exists manual_agent_email text,
  add column if not exists proposed_starts_at timestamptz,
  add column if not exists proposed_ends_at timestamptz,
  add column if not exists response_note text,
  add column if not exists reminded_at timestamptz,
  add column if not exists reminder_count smallint not null default 0;

alter table showing_requests add constraint showing_requests_home_check
  check (listing_id is not null or length(coalesce(manual_address, '')) > 0);
alter table showing_requests add constraint showing_requests_proposal_check
  check (proposed_starts_at is null or proposed_ends_at > proposed_starts_at);

-- Who may change what:
--  * Listing side: approve, decline, suggest a new time, and change its answer later.
--  * Requester: cancel, remind/resend, or accept the suggested time.
--  * Requester on a typed-in home (not in the system): records the listing agent's answer.
create or replace function guard_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;

  if old.listing_id is not null and is_listing_side(old.listing_id) then
    if new.requesting_agent_id <> old.requesting_agent_id or new.listing_id is distinct from old.listing_id then
      raise exception 'The home and requesting agent cannot be changed';
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

    -- Cancel, or remind/resend (only the reminder fields change).
    if new.starts_at <> old.starts_at or new.ends_at <> old.ends_at
       or new.proposed_starts_at is distinct from old.proposed_starts_at
       or new.proposed_ends_at is distinct from old.proposed_ends_at
       or new.response_note is distinct from old.response_note then
      raise exception 'Only the listing side can change the showing time';
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

-- The insert policy also checks that a saved client belongs to the requester.
drop policy if exists "request a showing" on showing_requests;
create policy "request a showing" on showing_requests for insert to authenticated
  with check (
    requesting_agent_id = auth.uid() and status = 'pending'
    and (client_id is null or exists (select 1 from clients c where c.id = client_id and c.agent_id = auth.uid()))
  );

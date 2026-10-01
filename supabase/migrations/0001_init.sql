-- REschedule database, version 1
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Row-level security (RLS) is on for every table, so people only ever see
-- rows they are allowed to see, even if someone calls the API directly.

create extension if not exists "pgcrypto";

-- ---------- Types ----------
create type profession as enum (
  'real_estate_broker', 'managing_broker', 'mortgage_loan_originator', 'appraiser', 'home_inspector',
  'attorney', 'contractor', 'insurance_producer', 'property_manager'
);
create type license_status as enum ('checking', 'verified', 'expired', 'rejected');
create type app_role as enum (
  'buyers_agent', 'listing_agent', 'managing_broker', 'transaction_coordinator',
  'buyer', 'seller', 'landlord', 'tenant', 'renter',
  'lender', 'attorney', 'inspector', 'appraiser', 'contractor', 'title', 'insurance', 'surveyor',
  'property_manager', 'photographer'
);
create type contact_method as enum ('app', 'text', 'email', 'call', 'online');
create type request_status as enum ('pending', 'approved', 'declined', 'countered', 'cancelled');
create type unit_status as enum ('waiting', 'approved', 'denied');
create type deal_side as enum ('buyer', 'seller', 'both');
create type interest_level as enum ('very', 'maybe', 'not');
create type feedback_status as enum ('draft', 'approved', 'sent', 'held');
create type review_kind as enum ('pro_to_pro', 'client_to_pro');

-- ---------- People ----------
create table brokerages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text,
  created_at timestamptz not null default now()
);

create table offices (
  id uuid primary key default gen_random_uuid(),
  brokerage_id uuid not null references brokerages on delete cascade,
  name text not null,
  city text
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references offices on delete cascade,
  name text not null
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  tagline text check (char_length(tagline) <= 80),
  bio text,
  headshot_path text,   -- file in the "avatars" storage bucket
  logo_path text,       -- file in the "logos" storage bucket
  brokerage_id uuid references brokerages,
  office_id uuid references offices,
  team_id uuid references teams,
  service_areas text[] not null default '{}',
  -- Roles that need no license (buyer, seller, landlord, tenant, renter...)
  self_roles app_role[] not null default '{}'
    check (self_roles <@ array['buyer','seller','landlord','tenant','renter','transaction_coordinator','title','surveyor','photographer']::app_role[]),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  profession profession not null,
  state text not null,             -- 'IL', 'IN', or 'NMLS' for the national ID
  number text not null,
  sponsor text,                    -- sponsoring brokerage or mortgage company
  expires_on date,
  ce_hours_logged numeric not null default 0,
  status license_status not null default 'checking',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, profession, state)
);

create table contact_preferences (
  profile_id uuid primary key references profiles on delete cascade,
  preferred contact_method not null default 'app',
  text_after_call boolean not null default false,
  online_scheduler_url text
);

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  kind text not null default 'photo',   -- photo, video, pdf
  label text,
  file_path text not null,             -- file in the "portfolio" bucket
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Availability ----------
create table availability_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_minute smallint not null check (start_minute between 0 and 1440),
  end_minute smallint not null check (end_minute between 0 and 1440),
  check (end_minute > start_minute)
);

create table busy_blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'manual',  -- manual, google, apple, outlook
  check (ends_at > starts_at)
);

-- ---------- Listings ----------
create table listings (
  id uuid primary key default gen_random_uuid(),
  listing_agent_id uuid references profiles,
  owner_id uuid references profiles,        -- set for owner (FSBO) listings
  source text not null default 'mls',       -- mls, fsbo
  mls_number text,
  address text not null,
  city text not null,
  state text not null,
  zip text,
  lat double precision,
  lng double precision,
  beds numeric, baths numeric, sqft integer, year_built integer,
  price_cents bigint,
  status text not null default 'active',
  instant_showings boolean not null default false,
  showing_minutes smallint not null default 30,
  notice_hours smallint not null default 2,
  occupancy text not null default 'owner',  -- owner, vacant, tenant
  created_at timestamptz not null default now()
);

create table listing_units (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  label text not null,              -- 'Unit 1', 'Common areas'
  tenant_profile_id uuid references profiles,
  tenant_name text,
  tenant_phone text
);

-- When the home can be shown (seller, tenants and listing agent combined).
create table listing_windows (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

-- ---------- Tours and showing requests ----------
create table tours (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles,
  client_label text not null,
  tour_date date not null,
  showing_minutes smallint not null default 30,
  status text not null default 'draft',     -- draft, sent, done
  created_at timestamptz not null default now()
);

create table showing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  requesting_agent_id uuid not null references profiles,
  tour_id uuid references tours on delete set null,
  buyer_label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  method contact_method not null default 'app',
  status request_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (ends_at > starts_at)
);
create index on showing_requests (listing_id, starts_at);
create index on showing_requests (requesting_agent_id, starts_at);

create table unit_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references showing_requests on delete cascade,
  unit_id uuid not null references listing_units on delete cascade,
  status unit_status not null default 'waiting',
  note text,
  responded_at timestamptz,
  unique (request_id, unit_id)
);

create table showing_feedback (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references showing_requests on delete cascade,
  buyer_agent_id uuid not null references profiles,
  overall numeric(2,1) check (overall between 1 and 5),
  liked text[] not null default '{}',
  concerns text[] not null default '{}',
  interest interest_level,
  include_interest boolean not null default true,
  status feedback_status not null default 'draft',  -- buyer's agent approves before it is sent
  shared_with_seller boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Deals ----------
create table deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings,
  property_address text not null,
  side deal_side not null,
  stage text not null default 'under_contract',
  acceptance_date date,
  closing_date date,
  loan_type text,               -- conventional, fha, va, cash...
  created_by uuid not null references profiles,
  created_at timestamptz not null default now()
);

create table deal_members (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  profile_id uuid references profiles,   -- null until the person joins the app
  role app_role not null,
  display_name text not null,
  phone text,
  email text,
  unique (deal_id, profile_id, role)
);
create index on deal_members (profile_id);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  kind text not null,
  label text not null,
  due_date date not null,
  done_at timestamptz,
  position smallint not null default 0
);

create table deal_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  title text not null,
  assignee_label text,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table loan_updates (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  author_id uuid not null references profiles,
  status text not null,
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals on delete cascade,
  reviewer_id uuid not null references profiles,
  reviewee_id uuid not null references profiles,
  kind review_kind not null,
  stars smallint not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  body text,
  work_again boolean,
  -- Pro-to-pro reviews are anonymous and post 30 days after closing.
  publish_after date not null,
  created_at timestamptz not null default now(),
  unique (deal_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

-- ---------- Helper functions (run with elevated rights, return only yes/no) ----------
create or replace function is_deal_member(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from deal_members where deal_id = d and profile_id = auth.uid());
$$;

create or replace function has_deal_role(d uuid, r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from deal_members where deal_id = d and profile_id = auth.uid() and role = r);
$$;

create or replace function is_listing_side(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from listings where id = l and (listing_agent_id = auth.uid() or owner_id = auth.uid())
  ) or exists (
    select 1 from listing_units where listing_id = l and tenant_profile_id = auth.uid()
  );
$$;

-- New sign-ups get a profile row automatically.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, new.raw_user_meta_data->>'phone');
  insert into contact_preferences (profile_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- People cannot mark their own license verified; only the verification service can.
create or replace function protect_license_status() returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    if tg_op = 'INSERT' then
      new.status := 'checking';
      new.verified_at := null;
    elsif new.status is distinct from old.status or new.verified_at is distinct from old.verified_at
          or new.number is distinct from old.number or new.state is distinct from old.state then
      new.status := 'checking';
      new.verified_at := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger licenses_protect before insert or update on licenses
  for each row execute function protect_license_status();

-- Only the listing side can approve or decline. The requesting agent may only cancel.
create or replace function guard_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or is_listing_side(old.listing_id) then
    if new.status is distinct from old.status then new.decided_at := now(); end if;
    return new;
  end if;
  if old.requesting_agent_id = auth.uid() then
    if new.status <> 'cancelled' or new.starts_at <> old.starts_at or new.ends_at <> old.ends_at
       or new.listing_id <> old.listing_id or new.requesting_agent_id <> old.requesting_agent_id then
      raise exception 'Only the listing side can approve, decline or change a showing request';
    end if;
    new.decided_at := now();
    return new;
  end if;
  raise exception 'Not allowed';
end;
$$;
create trigger showing_requests_guard before update on showing_requests
  for each row execute function guard_request_update();

-- ---------- Row-level security ----------
alter table brokerages enable row level security;
alter table offices enable row level security;
alter table teams enable row level security;
alter table profiles enable row level security;
alter table licenses enable row level security;
alter table contact_preferences enable row level security;
alter table portfolio_items enable row level security;
alter table availability_rules enable row level security;
alter table busy_blocks enable row level security;
alter table listings enable row level security;
alter table listing_units enable row level security;
alter table listing_windows enable row level security;
alter table tours enable row level security;
alter table showing_requests enable row level security;
alter table unit_approvals enable row level security;
alter table showing_feedback enable row level security;
alter table deals enable row level security;
alter table deal_members enable row level security;
alter table milestones enable row level security;
alter table deal_tasks enable row level security;
alter table loan_updates enable row level security;
alter table reviews enable row level security;

-- Organizations: readable by signed-in users (needed for REshow groups).
create policy "orgs readable" on brokerages for select to authenticated using (true);
create policy "offices readable" on offices for select to authenticated using (true);
create policy "teams readable" on teams for select to authenticated using (true);

-- Profiles: everyone signed in can see public profile info; you edit only yours.
create policy "profiles readable" on profiles for select to authenticated using (true);
create policy "edit own profile" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Licenses: verified licenses are public (trust); you manage your own.
create policy "see verified or own licenses" on licenses for select to authenticated using (status = 'verified' or profile_id = auth.uid());
create policy "add own license" on licenses for insert to authenticated with check (profile_id = auth.uid());
create policy "edit own license" on licenses for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "remove own license" on licenses for delete to authenticated using (profile_id = auth.uid());

create policy "contact prefs readable" on contact_preferences for select to authenticated using (true);
create policy "edit own contact prefs" on contact_preferences for update to authenticated using (profile_id = auth.uid());

create policy "public or own portfolio" on portfolio_items for select to authenticated using (is_public or profile_id = auth.uid());
create policy "manage own portfolio" on portfolio_items for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Availability: only free/busy matters, so signed-in users can read it for scheduling.
create policy "availability readable" on availability_rules for select to authenticated using (true);
create policy "manage own availability" on availability_rules for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "busy readable" on busy_blocks for select to authenticated using (true);
create policy "manage own busy" on busy_blocks for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Listings are public to signed-in users; the listing side manages them.
create policy "listings readable" on listings for select to authenticated using (true);
create policy "add listing" on listings for insert to authenticated with check (listing_agent_id = auth.uid() or owner_id = auth.uid());
create policy "listing side edits" on listings for update to authenticated using (listing_agent_id = auth.uid() or owner_id = auth.uid());
create policy "units visible to listing side" on listing_units for select to authenticated using (is_listing_side(listing_id));
create policy "listing side manages units" on listing_units for all to authenticated
  using (exists (select 1 from listings l where l.id = listing_id and (l.listing_agent_id = auth.uid() or l.owner_id = auth.uid())))
  with check (exists (select 1 from listings l where l.id = listing_id and (l.listing_agent_id = auth.uid() or l.owner_id = auth.uid())));
create policy "windows readable" on listing_windows for select to authenticated using (true);
create policy "listing side manages windows" on listing_windows for all to authenticated
  using (exists (select 1 from listings l where l.id = listing_id and (l.listing_agent_id = auth.uid() or l.owner_id = auth.uid())))
  with check (exists (select 1 from listings l where l.id = listing_id and (l.listing_agent_id = auth.uid() or l.owner_id = auth.uid())));

-- Tours belong to the agent who built them.
create policy "own tours" on tours for all to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Showing requests: the requesting agent and the listing side can see them.
create policy "see my requests" on showing_requests for select to authenticated
  using (requesting_agent_id = auth.uid() or is_listing_side(listing_id));
create policy "request a showing" on showing_requests for insert to authenticated
  with check (requesting_agent_id = auth.uid() and status = 'pending');
create policy "listing side decides" on showing_requests for update to authenticated
  using (is_listing_side(listing_id) or requesting_agent_id = auth.uid());

-- Tenants see and answer only their own unit.
create policy "unit approvals visible" on unit_approvals for select to authenticated using (
  exists (select 1 from listing_units u where u.id = unit_id and u.tenant_profile_id = auth.uid())
  or exists (select 1 from showing_requests r where r.id = request_id and (r.requesting_agent_id = auth.uid() or is_listing_side(r.listing_id)))
);
create policy "tenant answers own unit" on unit_approvals for update to authenticated using (
  exists (select 1 from listing_units u where u.id = unit_id and u.tenant_profile_id = auth.uid())
  or exists (select 1 from showing_requests r join listings l on l.id = r.listing_id where r.id = request_id and l.listing_agent_id = auth.uid())
);
create policy "listing side opens unit approvals" on unit_approvals for insert to authenticated with check (
  exists (select 1 from showing_requests r where r.id = request_id and (r.requesting_agent_id = auth.uid() or is_listing_side(r.listing_id)))
);

-- Feedback: written by the buyer's agent; the listing side sees it only once sent.
create policy "buyer agent manages feedback" on showing_feedback for all to authenticated
  using (buyer_agent_id = auth.uid()) with check (buyer_agent_id = auth.uid());
create policy "listing side reads sent feedback" on showing_feedback for select to authenticated using (
  status = 'sent' and exists (select 1 from showing_requests r where r.id = request_id and is_listing_side(r.listing_id))
);

-- Deals: only people on the deal.
create policy "members see deal" on deals for select to authenticated using (is_deal_member(id) or created_by = auth.uid());
create policy "create deal" on deals for insert to authenticated with check (created_by = auth.uid());
create policy "agents edit deal" on deals for update to authenticated using (
  created_by = auth.uid() or has_deal_role(id, 'buyers_agent') or has_deal_role(id, 'listing_agent') or has_deal_role(id, 'transaction_coordinator')
);
create policy "members see team" on deal_members for select to authenticated using (is_deal_member(deal_id) or exists (select 1 from deals d where d.id = deal_id and d.created_by = auth.uid()));
create policy "creator manages team" on deal_members for all to authenticated
  using (exists (select 1 from deals d where d.id = deal_id and d.created_by = auth.uid()))
  with check (exists (select 1 from deals d where d.id = deal_id and d.created_by = auth.uid()));
create policy "members see milestones" on milestones for select to authenticated using (is_deal_member(deal_id));
create policy "members update milestones" on milestones for all to authenticated using (is_deal_member(deal_id)) with check (is_deal_member(deal_id));
create policy "members see tasks" on deal_tasks for select to authenticated using (is_deal_member(deal_id));
create policy "members manage tasks" on deal_tasks for all to authenticated using (is_deal_member(deal_id)) with check (is_deal_member(deal_id));

-- Loan updates: the whole deal team reads; only the lender on the deal posts.
create policy "team reads loan updates" on loan_updates for select to authenticated using (is_deal_member(deal_id));
create policy "lender posts loan updates" on loan_updates for insert to authenticated
  with check (
    author_id = auth.uid() and has_deal_role(deal_id, 'lender')
    and exists (select 1 from licenses l where l.profile_id = auth.uid() and l.profession = 'mortgage_loan_originator' and l.status = 'verified')
  );

-- Reviews: reviewers see their own; everyone sees published ones, but the
-- reviewer's identity on pro-to-pro reviews is hidden by the view below.
create policy "write review on my deal" on reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and is_deal_member(deal_id));
create policy "see own written reviews" on reviews for select to authenticated using (reviewer_id = auth.uid());

create or replace view public_reviews with (security_invoker = false) as
  select r.id, r.reviewee_id, r.kind, r.stars, r.tags, r.body, r.created_at,
         case when r.kind = 'pro_to_pro' then null else r.reviewer_id end as reviewer_id,
         (select dm.role from deal_members dm where dm.deal_id = r.deal_id and dm.profile_id = r.reviewer_id limit 1) as reviewer_role
  from reviews r
  where r.publish_after <= current_date;
grant select on public_reviews to authenticated;

-- ---------- File storage ----------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true), ('logos', 'logos', true), ('portfolio', 'portfolio', true), ('deal-docs', 'deal-docs', false)
on conflict (id) do nothing;

-- People upload only into a folder named with their own user id.
create policy "upload own avatar/logo/portfolio" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own files" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text);
-- Deal documents: folder is the deal id; only deal members.
create policy "deal members read docs" on storage.objects for select to authenticated
  using (bucket_id = 'deal-docs' and is_deal_member(((storage.foldername(name))[1])::uuid));
create policy "deal members add docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'deal-docs' and is_deal_member(((storage.foldername(name))[1])::uuid));

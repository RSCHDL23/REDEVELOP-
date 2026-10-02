-- REschedule 0005
--  * earnest money amount and who holds it
--  * documents attached to showing requests (pre-approval letters...), shared by private expiring link
--  * buyers send homes from Zillow / Redfin / Realtor.com to their agent
--  * associations and MLS memberships on the profile

-- ---------- Earnest money ----------
alter table deals
  add column if not exists earnest_amount_cents bigint check (earnest_amount_cents >= 0),
  add column if not exists earnest_holder text check (earnest_holder in ('listing_brokerage', 'buyer_brokerage', 'title_company', 'attorney', 'builder', 'other')),
  add column if not exists earnest_holder_name text check (char_length(earnest_holder_name) <= 100);

-- To-dos made automatically from the deal's template can be told apart from ones added by hand.
alter table deal_tasks add column if not exists source text not null default 'manual';

-- ---------- Request documents ----------
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  file_path text not null,                -- in the private "showing-docs" bucket, under the owner's folder
  file_name text not null check (char_length(file_name) <= 120),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
alter table attachments enable row level security;
alter table showing_requests add column if not exists attachment_ids uuid[] not null default '{}';

create policy "owners manage attachments" on attachments for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "listing side sees request attachments" on attachments for select to authenticated using (
  exists (select 1 from showing_requests r where attachments.id = any (r.attachment_ids) and is_listing_side(r.listing_id))
);

insert into storage.buckets (id, name, public) values ('showing-docs', 'showing-docs', false) on conflict (id) do nothing;
create policy "upload own showing docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'showing-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners read showing docs" on storage.objects for select to authenticated
  using (bucket_id = 'showing-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Private links (/d/<token>) are checked on the server, which then makes a short-lived download link
-- with the service key. Nobody can list or open these files directly.
create or replace function attachment_by_token(p_token text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('path', a.file_path, 'name', a.file_name, 'mime', a.mime)
  from attachments a where a.token = p_token and a.expires_at > now()
$$;
revoke all on function attachment_by_token(text) from public;
grant execute on function attachment_by_token(text) to anon, authenticated;

-- Listing agents on REschedule can open documents attached to requests on their listings.
create or replace function attachment_visible(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from attachments a join showing_requests r on a.id = any (r.attachment_ids)
    where a.file_path = p_path and a.expires_at > now() and is_listing_side(r.listing_id)
  )
$$;
create policy "listing side reads request docs" on storage.objects for select to authenticated
  using (bucket_id = 'showing-docs' and attachment_visible(name));

-- ---------- Buyers send homes to their agent ----------
alter table profiles add column if not exists my_agent_id uuid references profiles on delete set null;

create table if not exists home_shares (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references profiles on delete cascade,
  agent_id uuid not null references profiles on delete cascade,
  url text not null check (url ~ '^https://(www\.)?(zillow\.com|redfin\.com|realtor\.com)/' and char_length(url) <= 600),
  source text not null check (source in ('zillow', 'redfin', 'realtor')),
  address text check (char_length(address) <= 200),
  note text check (char_length(note) <= 500),
  wants_tour boolean not null default true,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
alter table home_shares enable row level security;
create policy "buyers send to their agent" on home_shares for insert to authenticated
  with check (client_profile_id = auth.uid() and agent_id = (select my_agent_id from profiles where id = auth.uid()));
create policy "buyers see what they sent" on home_shares for select to authenticated using (client_profile_id = auth.uid());
create policy "agents see homes sent to them" on home_shares for select to authenticated using (agent_id = auth.uid());
create policy "agents mark seen" on home_shares for update to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- ---------- Associations and MLSs ----------
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('association', 'mls')),
  name text not null check (char_length(name) between 2 and 100),
  member_id text check (char_length(member_id) <= 40),
  data_access text not null default 'none' check (data_access in ('none', 'requested', 'connected')),
  created_at timestamptz not null default now()
);
alter table memberships enable row level security;
create policy "memberships readable" on memberships for select to authenticated using (true);
create policy "manage own memberships" on memberships for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Only the MLS data service (service role) can mark data access as connected.
create or replace function protect_membership_access() returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' and new.data_access = 'connected'
     and (tg_op = 'INSERT' or old.data_access is distinct from 'connected') then
    new.data_access := 'requested';
  end if;
  return new;
end;
$$;
create trigger memberships_access before insert or update on memberships for each row execute function protect_membership_access();

-- Association/MLS website (for forms and member resources) and the agent's own resource library.
alter table memberships add column if not exists url text check (url ~ '^https://' and char_length(url) <= 300);
alter table profiles add column if not exists my_resources jsonb not null default '[]'::jsonb;
alter table profiles add constraint profiles_my_resources_check check (jsonb_typeof(my_resources) = 'array' and jsonb_array_length(my_resources) <= 40);

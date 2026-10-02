-- REschedule 0006
--  * agreements sent to new clients through the agent's e-signature software
--  * loan programs on clients, with a NACA progress tracker
--  * documents on a request stay open until closing once an offer is accepted

-- ---------- E-signature software ----------
alter table profiles
  add column if not exists esign_provider text,
  add column if not exists esign_url text check (esign_url ~ '^https://' and char_length(esign_url) <= 300);
alter table profiles add constraint profiles_esign_provider_check
  check (esign_provider in ('docusign', 'dotloop', 'authentisign', 'skyslope', 'adobe', 'zipforms', 'other'));

-- ---------- Clients: agreements and loan programs ----------
alter table clients
  add column if not exists agreement_sent_at timestamptz,
  add column if not exists loan_program text not null default 'unknown',
  add column if not exists approved_monthly_cents integer check (approved_monthly_cents between 0 and 10000000),
  add column if not exists current_housing_cents integer check (current_housing_cents between 0 and 10000000),
  add column if not exists program_steps text[] not null default '{}',
  add column if not exists qualified_on date;
alter table clients add constraint clients_loan_program_check
  check (loan_program in ('unknown', 'conventional', 'fha', 'va', 'usda', 'naca', 'cash', 'other'));

-- ---------- Documents last until closing once an offer is accepted ----------
-- Extends (never shortens) the private links on the owner's requests for a property.
create or replace function extend_property_docs(p_address text, p_until timestamptz)
returns integer language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  update attachments a set expires_at = greatest(a.expires_at, p_until)
  where a.owner_id = auth.uid()
    and exists (
      select 1 from showing_requests r left join listings l on l.id = r.listing_id
      where r.requesting_agent_id = auth.uid() and a.id = any (r.attachment_ids)
        and length(trim(p_address)) >= 5
        and starts_with(lower(coalesce(l.address, r.manual_address, '')), lower(trim(p_address)))
    );
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function extend_property_docs(text, timestamptz) to authenticated;

-- DRAFT: Do not apply until company, Stripe and fulfilment review are complete.
-- Independent checkout schema; existing NFC/time tables untouched.
create schema if not exists lyndquote;
create table if not exists lyndquote.orders (
 id uuid primary key default gen_random_uuid(),
 stripe_session_id text unique not null,
 stripe_payment_intent_id text,
 email text not null,
 edition text not null check (edition in ('standard','custom')),
 additional_seats integer not null default 0 check (additional_seats between 0 and 20),
 amount_pence integer not null check (amount_pence >= 0),
 currency text not null default 'gbp',
 status text not null default 'pending' check (status in ('pending','paid','refunded','disputed')),
 immediate_supply_consent boolean not null,
 cancellation_acknowledgement boolean not null,
 terms_version text not null,
 marketing_opt_in boolean not null default false,
 marketing_consent_at timestamptz,
 survey_choices text[] not null default '{}',
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists lyndquote.licences (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references lyndquote.orders(id),
 seat_number integer not null check (seat_number >= 1),
 token_hash text unique,
 activated_at timestamptz,
 revoked_at timestamptz,
 device_label text,
 created_at timestamptz not null default now(),
 unique(order_id, seat_number)
);
create table if not exists lyndquote.events (
 stripe_event_id text primary key,
 event_type text not null,
 received_at timestamptz not null default now()
);
alter table lyndquote.orders enable row level security;
alter table lyndquote.licences enable row level security;
alter table lyndquote.events enable row level security;
-- No anonymous/authenticated policies: service-role Edge Functions only.
revoke all on schema lyndquote from anon, authenticated;
revoke all on all tables in schema lyndquote from anon, authenticated;

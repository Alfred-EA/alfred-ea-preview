-- Stripe/Supabase billing integration. Safe to run more than once.
alter table public.memberships add column if not exists plan_level smallint check (plan_level between 1 and 10);
alter table public.memberships add column if not exists stripe_customer_id text;
alter table public.memberships add column if not exists stripe_subscription_id text;
alter table public.memberships add column if not exists stripe_price_id text;
alter table public.memberships add column if not exists stripe_subscription_status text;
alter table public.memberships add column if not exists cancel_at_period_end boolean not null default false;

create unique index if not exists memberships_stripe_customer_uidx
  on public.memberships(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists memberships_stripe_subscription_uidx
  on public.memberships(stripe_subscription_id) where stripe_subscription_id is not null;

alter table public.invoices add column if not exists stripe_invoice_id text;
alter table public.invoices add column if not exists stripe_hosted_url text;
alter table public.invoices add column if not exists stripe_pdf_url text;
create unique index if not exists invoices_stripe_invoice_uidx
  on public.invoices(stripe_invoice_id) where stripe_invoice_id is not null;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;


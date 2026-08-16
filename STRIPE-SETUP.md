# Stripe test integration

The website uses three Supabase Edge Functions:

- `create-checkout-session`: authenticated subscription Checkout.
- `create-portal-session`: authenticated Stripe Billing Portal access.
- `stripe-webhook`: signed, idempotent membership and invoice updates.

## Required configuration

1. Run `supabase-stripe-billing.sql` in the Supabase SQL editor.
2. Add the variables from `supabase/.env.example` under **Supabase → Edge Functions → Secrets**. Enter the real test secret key and webhook signing secret only in Supabase.
3. Deploy all three functions. The webhook function must use `verify_jwt = false`; it authenticates Stripe using the signing secret.
4. In Stripe Test mode, enable the customer portal and permit subscription cancellation and payment-method updates.
5. Create a Stripe webhook endpoint pointing to:
   `https://lstjmanxzpsnuxonspfc.supabase.co/functions/v1/stripe-webhook`
6. Subscribe it to:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.finalized`, `invoice.paid`, and `invoice.payment_failed`.
7. Copy the endpoint signing secret into the Supabase secret `STRIPE_WEBHOOK_SECRET`.

Test with Stripe test cards before replacing the test secret and price map with live values.

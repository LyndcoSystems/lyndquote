# LyndQuote checkout & licensing — non-production development branch

Nothing in this branch accepts live payments. No licence may be issued merely because a user visits a success URL.

## Intended architecture
- Stripe-hosted Checkout, fixed server-calculated GBP prices: Standard £39 / Custom £59, plus £15 per extra seat.
- Use a Stripe webhook verified with Stripe's exact signed raw body and endpoint secret, with replay/idempotency handling.
- Supabase isolated schema `lyndquote`, RLS enabled and no public table access.
- Fulfilment only after `checkout.session.completed` with paid state, and async-payment event support if those methods are enabled.
- Refund/dispute events revoke or suspend access according to reviewed terms.
- One paid base seat + purchased seats; one-time activation tokens, server-side hashing and audited device resets.
- Front-end credentials never contain service-role key or Stripe secret.
- Contract confirmation and fulfilment email require a transactional email provider to be configured before launch.
- Do not trust client-provided prices, client-declared payments or survey choices as consent to marketing.
- Market research survey voluntary, separate unticked marketing opt-in with withdrawal path.
- Offline licensing cannot completely prevent copying. Any offline grace period must be documented and tested.

## Required before deployment
1. Incorporation, bank account, Stripe verified account, support email and registered office.
2. Approval of UK-only scope, VAT position, legal policies and refund handling.
3. Transactional email provider, webhook endpoint and Stripe signing secret.
4. Implement and test webhook/fulfilment/device activation (not yet built).
5. Independent legal review and full automated/manual test plan.

## Status
- `migration.sql`: draft isolated data model, NOT applied.
- `create-checkout.ts`: preparatory endpoint code, NOT deployed.
- `legal-drafts.md`: drafting guidance requiring trader details and review.
- Existing production app and demo untouched.

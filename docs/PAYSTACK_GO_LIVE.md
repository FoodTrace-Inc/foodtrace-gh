# Paystack - go-live checklist

Do not flip to live keys until every box below is actually checked, not
assumed. Real money moves once `sk_live_...` is in place.

## Environment variables required for live mode

Backend (Render service, "Environment" tab):
- `PAYSTACK_SECRET_KEY=sk_live_xxxxx` - server-only, never sent to the
  browser, never committed to git. Used to call Paystack's API and to verify
  the `x-paystack-signature` header on incoming webhooks.
- `PAYSTACK_PUBLIC_KEY=pk_live_xxxxx` - safe to expose, but stays
  backend-side here too since the mobile hosted-checkout flow reads it from
  `AppProperties`.

Web build (GitHub Actions repo secret, read by `.github/workflows/deploy-web.yml`):
- `VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx` - baked into the built JS bundle
  at build time and used by the browser's Paystack inline popup. This must
  only ever be the **public** key - never put `sk_live_...` here, since
  anything in a Vite `VITE_*` variable ships to every visitor's browser.

Never commit real `sk_live_...` or `pk_live_...` values to the repository.
Set them only in Render's environment settings and the GitHub Actions
secret store.

## Checklist

- [ ] All test payments working correctly (see `PAYSTACK_TESTING.md`)
- [ ] Webhook endpoint is live and verified (Paystack dashboard shows
      successful webhook deliveries, not just "configured")
- [ ] Subscription limits enforced correctly for every tier and role
- [ ] Payment notifications (push + email) sending correctly for all five
      events: success, 7-day warning, 1-day warning, failure, cancellation
- [ ] Refund flow - **not built**; if you need this before launch, say so
      explicitly and it needs to be added (Paystack's `/refund` endpoint)
- [ ] Replace `pk_test_...` with `pk_live_...` (`PAYSTACK_PUBLIC_KEY` on
      Render, `VITE_PAYSTACK_PUBLIC_KEY` GitHub secret)
- [ ] Replace `sk_test_...` with `sk_live_...` (`PAYSTACK_SECRET_KEY` on
      Render only - never in a GitHub secret used by the web build, since
      that ships to the browser)
- [ ] Re-register the webhook URL in the live-mode Paystack dashboard (test
      and live mode have separate webhook configurations)
- [ ] Test one real GHS 1 payment end to end to confirm live mode actually
      works before telling users it's ready

## What the backend now enforces before activating a subscription

- `/api/payments/verify/{reference}` requires a valid JWT and confirms the
  stored payment's `user_id` matches the authenticated user before doing
  anything else.
- The Paystack `status` must be exactly `"success"`.
- The Paystack `currency` must be `"GHS"`.
- The Paystack `amount` (in kobo/pesewas) must exactly match the stored
  payment's amount, converted the same way.
- The Paystack `reference` returned must match the reference being verified.
- Only when all of the above hold does `reconcile()` mark the payment
  successful and activate/renew the subscription. Anything else is recorded
  as `failed` and does not touch the subscription.
- The webhook (`charge.success`) applies the same amount/currency check
  before reconciling, and `reconcile()` itself is idempotent (`WHERE
  status <> 'success'`), so verify and webhook racing on the same reference
  is safe either way.
- `/api/payments/subscription/{userId}` and `/api/payments/subscription/cancel`
  now also require a valid JWT and only ever act on the authenticated
  user's own subscription - a user id path/body parameter can no longer be
  used to read or cancel someone else's subscription.

Once every box above is genuinely checked (not just "looks right"), let me
know and I'll help verify the live-mode switch - I still can't complete a
real payment myself, so the actual GHS 1 test transaction needs a human.

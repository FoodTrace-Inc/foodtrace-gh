# Paystack payments — test mode guide

Everything below assumes `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` are set
to your **test** keys (`pk_test_...` / `sk_test_...`) on Render, and
`VITE_PAYSTACK_PUBLIC_KEY` is set as a GitHub Actions secret (same public
key) so the web build picks it up.

## One-time setup

1. Sign up at https://dashboard.paystack.com/#/signup.
2. Copy the test public/secret keys from Settings → API Keys & Webhooks.
3. Set them as environment variables on Render (`PAYSTACK_PUBLIC_KEY`,
   `PAYSTACK_SECRET_KEY`) and redeploy.
4. Add `VITE_PAYSTACK_PUBLIC_KEY` as a repo secret (Settings → Secrets and
   variables → Actions) with the same public key, then re-run the
   "Deploy web to GitHub Pages" workflow so the build picks it up.
5. In the Paystack dashboard, set the webhook URL to:
   `https://foodtrace-gh.onrender.com/api/payments/webhook`

## Test cards

| Scenario | Card number | CVV | Expiry |
|---|---|---|---|
| Successful payment | 4084 0840 8408 4081 | 408 | 01/25 |
| Declined payment | 4084 0840 8408 4084 | 408 | 01/25 |

## Test Mobile Money

Any valid Ghana phone number format works in test mode:
- MTN: `0241234567`
- Vodafone: `0501234567`

## Checklist

Run through each of these manually — I can't click through a real payment
myself without live keys, so this is on you (or whoever's testing):

- [ ] Successful card payment activates the subscription (check
      `/api/payments/subscription/{userId}` shows `status: active` and the
      correct `plan`)
- [ ] Declined card payment shows the failure screen (mobile) / error
      message (web), and no subscription is created
- [ ] Mobile Money payment works end to end
- [ ] The webhook fires and reconciles the payment even if the app is
      closed before verify() runs (this is the whole point of having both —
      verify() and the webhook are idempotent against each other)
- [ ] Subscription limits are enforced:
  - Manufacturer/pharmacist with no active subscription gets a 402 with
    "Subscribe to start listing your products" when creating a batch
  - Micro plan blocks the 11th batch; Small blocks the 51st; Medium blocks
    the 201st; Large never blocks
  - Consumer gets a 402 with the upgrade message after 20 scans in a
    calendar month; premium consumers never get blocked
- [ ] Payment history shows in the account page (web Profile, mobile
      Subscription Management)
- [ ] Cancellation sets `status: cancelled` and stops future renewal
      reminders
- [ ] Expiry reminders: the daily job (`SubscriptionExpiryNotifier`, runs at
      08:00 server time) sends a push + email exactly once per subscription
      at 7 days and 1 day before `expires_at` — check the `notifications`
      table and Resend's dashboard (or backend logs if `RESEND_API_KEY`
      isn't set) rather than waiting a real week; you can fake this by
      manually setting a subscription's `expires_at` to `now() + interval
      '7 days'` in the database and running the job once via a quick
      `@Scheduled` trigger or waiting for 08:00.

## Known gaps at the time of writing

- Refunds are not implemented (Paystack supports them via
  `/refund` — not built here since the spec didn't require it beyond an
  optional checklist item).
- The manufacturer/pharmacist mobile portal doesn't yet have its own
  "Subscribe" entry button into the payment screens (the screens
  themselves are role-agnostic and already work if wired in).

# Paystack — go-live checklist

Do not flip to live keys until every box below is actually checked, not
assumed. Real money moves once `sk_live_...` is in place.

- [ ] All test payments working correctly (see `PAYSTACK_TESTING.md`)
- [ ] Webhook endpoint is live and verified (Paystack dashboard shows
      successful webhook deliveries, not just "configured")
- [ ] Subscription limits enforced correctly for every tier and role
- [ ] Payment notifications (push + email) sending correctly for all five
      events: success, 7-day warning, 1-day warning, failure, cancellation
- [ ] Refund flow — **not built**; if you need this before launch, say so
      explicitly and it needs to be added (Paystack's `/refund` endpoint)
- [ ] Replace `pk_test_...` with `pk_live_...` (`PAYSTACK_PUBLIC_KEY` on
      Render, `VITE_PAYSTACK_PUBLIC_KEY` GitHub secret)
- [ ] Replace `sk_test_...` with `sk_live_...` (`PAYSTACK_SECRET_KEY` on
      Render only — never in a GitHub secret used by the web build, since
      that ships to the browser)
- [ ] Re-register the webhook URL in the live-mode Paystack dashboard (test
      and live mode have separate webhook configurations)
- [ ] Test one real GHS 1 payment end to end to confirm live mode actually
      works before telling users it's ready

Once every box above is genuinely checked (not just "looks right"), let me
know and I'll help verify the live-mode switch — I still can't complete a
real payment myself, so the actual GHS 1 test transaction needs a human.

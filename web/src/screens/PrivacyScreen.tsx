import { LegalScreen, LegalHeading, LegalParagraph } from "./LegalScreen";

export function PrivacyScreen() {
  return (
    <LegalScreen title="Privacy policy" updated="July 2026">
      <LegalParagraph>
        This explains what information FoodTrace GH collects, why, and how it's used.
      </LegalParagraph>

      <LegalHeading>Information we collect</LegalHeading>
      <LegalParagraph>
        Account details: full name, phone number and/or email, role, and language preference.
        Activity data: scans you perform, reports you submit, and — for sellers — the products,
        batches, and farm records you create. Payment data: Paystack processes your card or Mobile
        Money details directly; we never see or store your card number, CVV, or Mobile Money PIN. We
        only receive the transaction reference, amount, status, and payment channel (card vs. Mobile
        Money) from Paystack.
      </LegalParagraph>

      <LegalHeading>How we use it</LegalHeading>
      <LegalParagraph>
        To run the core service: verifying scans, showing your dashboard, tracking your subscription
        and free-scan usage, and sending you notifications (in-app, push, and email) about scan
        results, recalls affecting products you've scanned, and payment/subscription events (success,
        failure, renewal reminders, cancellation).
      </LegalParagraph>

      <LegalHeading>Who can see what</LegalHeading>
      <LegalParagraph>
        Regulator accounts can see compliance data across the network (reports, recalls, audit
        alerts) as part of their oversight role. Marketplace posts you create as a seller are public
        to other users. Your personal account details (phone, email) are never shown to other
        consumers or sellers.
      </LegalParagraph>

      <LegalHeading>Third parties</LegalHeading>
      <LegalParagraph>
        Paystack (payments), Resend (transactional email), and push notification delivery via Expo.
        Each only receives the minimum data needed to do its job — for example, Paystack receives your
        email and the amount to charge, not your full account profile.
      </LegalParagraph>

      <LegalHeading>Your choices</LegalHeading>
      <LegalParagraph>
        You can cancel your subscription at any time from your account page. You can request account
        deletion by contacting support; we'll remove your personal details while retaining anonymized
        records where required for food-safety audit trails (e.g. a recall history isn't deleted just
        because the reporting account is).
      </LegalParagraph>

      <LegalHeading>Changes</LegalHeading>
      <LegalParagraph>
        If this policy changes materially, we'll update the date at the top of this page.
      </LegalParagraph>
    </LegalScreen>
  );
}

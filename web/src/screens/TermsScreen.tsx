import { LegalScreen, LegalHeading, LegalParagraph } from "./LegalScreen";

export function TermsScreen() {
  return (
    <LegalScreen title="Terms and conditions" updated="July 2026">
      <LegalParagraph>
        By creating an account or using FoodTrace GH, you agree to these terms. If you don't agree,
        please don't use the platform.
      </LegalParagraph>

      <LegalHeading>1. What FoodTrace GH is</LegalHeading>
      <LegalParagraph>
        FoodTrace GH is a traceability and safety-information platform. It is an information tool, not
        a medical, legal, or regulatory authority. Safety statuses shown for a scanned product reflect
        the information available to us at the time of the scan and may not capture every real-world
        risk.
      </LegalParagraph>

      <LegalHeading>2. Accounts and roles</LegalHeading>
      <LegalParagraph>
        Consumers, farmers, manufacturers, pharmacists, and regulators each get a role-specific
        account. You're responsible for keeping your login credentials confidential and for the
        accuracy of any information you submit (batch details, farm records, product listings, consumer
        reports).
      </LegalParagraph>

      <LegalHeading>3. Subscriptions and payments</LegalHeading>
      <LegalParagraph>
        Manufacturer and pharmacist accounts require an active subscription plan to list products and
        generate QR codes, billed monthly through Paystack. Consumers get 20 free scans per month, with
        an optional premium plan for unlimited scans. Subscriptions renew automatically unless
        cancelled; cancelling stops future billing but does not refund the current billing period
        unless required by law.
      </LegalParagraph>

      <LegalHeading>4. Content you submit</LegalHeading>
      <LegalParagraph>
        You're responsible for anything you post — product listings, consumer reports, farm or batch
        records. We may remove content that's false, unsafe, or violates these terms, and regulator
        accounts may act on reports and recalls submitted through the platform.
      </LegalParagraph>

      <LegalHeading>5. No warranty</LegalHeading>
      <LegalParagraph>
        FoodTrace GH is provided "as is." We do not guarantee that scan results are complete, current,
        or error-free. Always use independent judgment — and consult a qualified health professional —
        before acting on safety information shown here, especially for medicines.
      </LegalParagraph>

      <LegalHeading>6. Changes</LegalHeading>
      <LegalParagraph>
        We may update these terms as the platform evolves. Continuing to use FoodTrace GH after a
        change means you accept the updated terms.
      </LegalParagraph>
    </LegalScreen>
  );
}

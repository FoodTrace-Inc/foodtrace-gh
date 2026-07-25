import { LegalScreen, LegalHeading, LegalParagraph } from "./LegalScreen";

export function AboutScreen() {
  return (
    <LegalScreen title="About FoodTrace GH" updated="July 2026">
      <LegalParagraph>
        FoodTrace GH is a food and drug safety traceability platform for Ghana. It connects consumers,
        farmers, manufacturers, pharmacists, and the Food and Drugs Authority (FDA) in one system, so
        that anyone can scan a QR code on a product and instantly see whether it's verified safe,
        under caution, or recalled.
      </LegalParagraph>

      <LegalHeading>What we do</LegalHeading>
      <LegalParagraph>
        Manufacturers and pharmacies register their batches and generate a unique QR code for each
        one. Consumers scan that code — no account required for a basic scan — and see the product's
        safety status, batch details, and any active recalls, sourced from our own records and
        synced against the Ghana FDA's public product registry.
      </LegalParagraph>
      <LegalParagraph>
        Farmers can log crop cycles, pesticide/input use, and safe-harvest dates. Regulators get a
        compliance dashboard across the whole network — reports, recalls, and audit alerts — and can
        issue a recall directly from the platform.
      </LegalParagraph>

      <LegalHeading>Who built this</LegalHeading>
      <LegalParagraph>
        FoodTrace GH was built as an entry for the CodeQuest competition, with the goal of making
        product safety information something anyone in Ghana can check in seconds, on any phone,
        without needing to trust a label alone.
      </LegalParagraph>

      <LegalHeading>Disclaimer</LegalHeading>
      <LegalParagraph>
        Product safety information is sourced from the Ghana FDA public register and from data
        submitted by manufacturers and pharmacies. FoodTrace GH is not affiliated with or endorsed by
        the Ghana FDA. Always consult a qualified health professional before making decisions about
        medicines.
      </LegalParagraph>
    </LegalScreen>
  );
}

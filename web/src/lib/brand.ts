import type { Theme } from "../theme/ThemeContext";
import type { IconName } from "../components/Icon";

// ─── Wordmark & taglines ──────────────────────────────────────────────────────
export const APP_NAME = "FoodTrace GH";
export const TAGLINE = "Scan it. Trace it. Trust it.";
export const SUBTAG = "Scan. Verify. Stay safe.";
export const HERO_BLURB =
  "One traceability platform connecting consumers, farmers, manufacturers, pharmacists and FDA regulators — so every product on Ghana's shelves can be scanned, verified and trusted.";

// ─── Theme-aware hero gradient (mirrors the mobile splash's dark-green world) ──
export function heroGradient(theme: Theme): string {
  return theme === "dark"
    ? "radial-gradient(circle at 30% 0%, #0f5d49 0%, #08131b 46%, #05070a 100%)"
    : "radial-gradient(circle at 30% 0%, #ffe9c2 0%, #fff3e0 46%, #f4f6f4 100%)";
}

// ─── What each role gets ──────────────────────────────────────────────────────
export interface RoleDef {
  key: string;
  label: string;
  icon: IconName;
  blurb: string;
  points: string[];
}

export const ROLES: RoleDef[] = [
  {
    key: "consumer",
    label: "Consumers",
    icon: "user",
    blurb: "Know what you're buying before it reaches your table.",
    points: ["Scan any QR to check safety", "Recall & expiry alerts", "Report unsafe products"],
  },
  {
    key: "farmer",
    label: "Farmers",
    icon: "leaf",
    blurb: "Log inputs and prove your harvest is safe to sell.",
    points: ["Track pesticide use & withdrawal", "Weather-aware planning", "Safe-harvest dates"],
  },
  {
    key: "manufacturer",
    label: "Manufacturers",
    icon: "factory",
    blurb: "Turn every batch into a traceable, verifiable product.",
    points: ["Generate batch QR codes", "Full ingredient trace", "One-tap recalls"],
  },
  {
    key: "regulator",
    label: "FDA Regulators",
    icon: "shield",
    blurb: "See the whole supply chain and act on risk fast.",
    points: ["Compliance overview", "Live safety alerts", "Issue nationwide recalls"],
  },
  {
    key: "pharmacist",
    label: "Pharmacists",
    icon: "pill",
    blurb: "Verify medicines and keep counterfeits off the shelf.",
    points: ["Scan drug QR codes", "Batch & expiry tracking", "Flag banned drugs"],
  },
];

// ─── Feature highlights ───────────────────────────────────────────────────────
export interface FeatureDef {
  icon: IconName;
  title: string;
  desc: string;
}

export const FEATURES: FeatureDef[] = [
  {
    icon: "scan",
    title: "Instant QR verification",
    desc: "Point, scan and get a clear Safe / Caution / Recalled verdict in seconds — no account required to check a product.",
  },
  {
    icon: "route",
    title: "Farm-to-shelf traceability",
    desc: "Every batch carries its full story: origin farm, inputs applied, processing steps and quality checks.",
  },
  {
    icon: "bell",
    title: "Recall & expiry alerts",
    desc: "When a product is recalled or nearing expiry, everyone who scanned it is notified — instantly.",
  },
  {
    icon: "store",
    title: "Trusted marketplace",
    desc: "Farmers and manufacturers list verified stock; buyers scan the QR right from the feed before they commit.",
  },
  {
    icon: "spark",
    title: "AI safety assistant",
    desc: "Ask about a pesticide, a drug or a recall in plain English or Twi and get a grounded, sourced answer.",
  },
  {
    icon: "cloud",
    title: "Weather & farm tools",
    desc: "Region-aware forecasts and input logging help farmers hit safe harvest windows and stay compliant.",
  },
];

// ─── How it works ─────────────────────────────────────────────────────────────
export interface StepDef {
  n: string;
  title: string;
  desc: string;
}

export const STEPS: StepDef[] = [
  { n: "01", title: "Scan", desc: "Scan the QR code on any food or medicine — in the app or straight from the web." },
  { n: "02", title: "Verify", desc: "We check the batch against FDA records, recalls and expiry in real time." },
  { n: "03", title: "Trace", desc: "Follow the product back through its supply chain, from shelf to source." },
  { n: "04", title: "Act", desc: "Buy with confidence, report a problem, or trigger a recall — depending on your role." },
];

// ─── Trust chips shown under the hero ─────────────────────────────────────────
export const TRUST_CHIPS = ["FDA-aligned", "Works on any phone", "English & Twi", "Made in Ghana"];

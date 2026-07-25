export interface PlanDef {
  key: string;
  name: string;
  priceGhs: number;
  period: string;
  features: string[];
  popular?: boolean;
}

export const SELLER_PLANS: PlanDef[] = [
  { key: "micro", name: "Micro", priceGhs: 50, period: "month", features: ["Up to 10 products", "10 QR codes"] },
  { key: "small", name: "Small", priceGhs: 150, period: "month", features: ["Up to 50 products", "50 QR codes"], popular: true },
  { key: "medium", name: "Medium", priceGhs: 400, period: "month", features: ["Up to 200 products", "200 QR codes"] },
  { key: "large", name: "Large", priceGhs: 1000, period: "month", features: ["Unlimited products", "Unlimited QR codes"] },
];

export const CONSUMER_PLANS: PlanDef[] = [
  { key: "premium", name: "Premium", priceGhs: 10, period: "month", features: ["Unlimited scans", "Full scan history", "Watchlist with recall alerts", "Priority customer support"] },
];

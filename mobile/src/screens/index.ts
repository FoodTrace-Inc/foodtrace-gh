/**
 * mobile/src/screens/index.ts
 *
 * Barrel export so App.tsx can import all consumer screens from one path:
 *
 *   import {
 *     QRScannerScreen,
 *     SafetyResultScreen,
 *     ScanHistoryScreen,
 *     ConsumerReportScreen,
 *   } from "./src/screens";
 */

export { QRScannerScreen } from "./QRScannerScreen";
export { SafetyResultScreen } from "./SafetyResultScreen";
export { ScanHistoryScreen } from "./ScanHistoryScreen";
export { ConsumerReportScreen } from "./ConsumerReportScreen";
export { MarketplaceFeedScreen } from "./MarketplaceFeedScreen";
export { MarketplaceComposeScreen } from "./MarketplaceComposeScreen";
export { SplashIntro } from "./SplashIntro";
export { NotificationsModal } from "./NotificationsModal";
export type { AppNotification } from "./NotificationsModal";

// Re-export the HistoryEntry type so App.tsx doesn't need to import it
// from the individual file.
export type { HistoryEntry } from "./ScanHistoryScreen";
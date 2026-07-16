# FoodTrace GH Production MVP Scope

This document freezes the first real-app version of FoodTrace GH. The goal is a focused pilot that real users can test safely, not the full national platform described in the proposal.

## MVP Goal

FoodTrace GH MVP should let a small Ghana pilot group register, create traceable food batches, scan QR codes, report suspected safety issues, and issue recalls through a regulator view.

The first real pilot should prove this loop:

1. A farmer records a farm, crop cycle, and key inputs.
2. A manufacturer creates a food batch linked to traceability data.
3. FoodTrace generates a QR code for that batch.
4. A consumer scans the QR code and sees a clear safety result.
5. A consumer submits a safety report when something looks wrong.
6. A regulator reviews reports and can issue a recall.
7. Future scans show the updated recall state.

## In Scope for the First Real App

### Authentication and Roles

- Consumer, farmer, manufacturer, and regulator accounts.
- Email or phone-based identity fields.
- Password login for the first pilot.
- Role-based access to the correct portal.
- Admin-seeded regulator accounts for pilot safety.

### Consumer Experience

- Scan or type a FoodTrace QR/batch code.
- See a plain-language safety result.
- See strong color states:
  - Green: verified safe
  - Yellow: caution or under review
  - Red: recalled or unsafe
- Submit a safety report with description, district, and optional photo.
- Hear or request a simple audio summary where available.

### Farmer Experience

- Create a farm profile.
- Create crop cycles.
- Log key inputs:
  - pesticide
  - fertilizer
  - seed
  - irrigation or other notes
- Calculate or display safe harvest/market readiness based on withdrawal timing.
- Save enough data for a manufacturer or regulator to review the source.

### Manufacturer Experience

- Create manufacturer profile.
- Create food product batches.
- Add batch number, packaging date, expiry date, quality status, and source notes.
- Generate a unique QR code per batch.
- View created batches and scan counts.
- Self-issue a manufacturer recall for a batch.

### Regulator Experience

- View dashboard metrics for the pilot.
- View consumer reports.
- Change report status.
- View active recalls.
- Issue regulator recall for a batch.
- See basic district-level risk information.

### Backend and Data

- PostgreSQL as the source of truth.
- Database migrations and seed data.
- Health check endpoints (`GET /health` and `GET /api/health`).
- Environment variable configuration.
- Basic API rate limiting and error handling.

Note: Redis is **not** required by the main Spring API (health reports `redis: not_configured`). Farmer offline-sync and Expo push notifications are implemented in the main codebase; large-scale national push fan-out remains out of scope below.

### Mobile and Web

- Web portal for consumer, farmer, manufacturer, and regulator workflows.
- Expo mobile app for consumer scanning and field testing.
- Android-first pilot testing.
- API base URL configurable for local, staging, and production.

## Out of Scope for the First Real App

These are important, but they should not block the first pilot.

- Full national FDA/GSA production integration.
- Paid subscriptions and billing.
- Marketplace or e-commerce.
- Logistics and delivery tracking.
- Laboratory testing API integration.
- Export certificates.
- Advanced analytics, heatmaps, PDF exports, and forecasting.
- Real public USSD shortcode.
- Large-scale SMS broadcast.
- National-scale push fan-out beyond Expo device tokens already registered in-app.
- AWS S3 and Rekognition production setup.
- Blockchain.
- Multi-country support.
- Livestock/animal traceability.
- Complete drug/pharmacy production module (Pages demo enables the UI flag; full pharmacy ops remain pilot-scoped).

## Pilot Data Boundary

The first pilot should use a small controlled dataset:

- 1 to 3 farmers.
- 1 to 2 manufacturers.
- 5 to 15 real or test food batches.
- 10 to 30 test consumers.
- 1 to 3 regulator/admin reviewers.

Do not put sensitive personal data, exact private farm GPS coordinates, or real regulatory decisions into the pilot until legal/privacy review is complete.

## Definition of Done

The production MVP is ready for a real pilot when all of these pass:

- A new consumer can register, log in, scan a QR code, and submit a report.
- A farmer can create a farm, crop cycle, and input log without developer help.
- A manufacturer can create a batch and get a QR code that scans correctly.
- A regulator can review reports and issue a recall.
- A recalled QR code immediately returns a red safety result.
- Backend, web, and database are deployed online behind HTTPS.
- Mobile app can point to the deployed API.
- Demo seed data is separated from pilot data.
- Error messages are understandable to non-developers.
- No critical TypeScript, migration, or API smoke-test failures remain.

## Deployment

- Backend host: Railway
- Backend URL: pending Railway deployment URL
- Backend health check: `/health` (alias `/api/health`)
- Production database: Railway/Render PostgreSQL
- Production cache: not required for main API (Redis optional for analytics-service only)

## Later Roadmap

After the pilot works, the next release can add:

- Real SMS integration.
- Shared USSD shortcode.
- Stronger offline-first farmer app.
- Push notifications.
- Full pesticide reference search.
- QR label download and print templates.
- Production file storage.
- Regulator analytics exports.
- Drug/pharmacy module expansion.
- Institution onboarding and payment plans.

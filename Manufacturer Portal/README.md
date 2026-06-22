# FoodTrace GH — Role 4: Manufacturer Portal & Recall System

## Project Structure

```
foodtrace-manufacturer/
├── backend/
│   ├── migrations/001_initial.sql   ← Run this first to create all DB tables
│   ├── src/
│   │   ├── index.js                 ← Express app entry point
│   │   ├── config/db.js             ← PostgreSQL connection
│   │   ├── middleware/auth.js       ← JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js              ← Register, OTP verify, login, /me
│   │   │   ├── batches.js           ← Batch CRUD + QR generation + scan endpoint
│   │   │   └── recalls.js           ← Issue/list/resolve recalls + notifications
│   │   └── services/
│   │       ├── emailService.js      ← OTP emails + recall alert emails (nodemailer)
│   │       ├── qrService.js         ← QR code generation (qrcode npm)
│   │       ├── smsService.js        ← Africa's Talking SMS (placeholder)
│   │       └── notificationService.js ← FCM push notifications (placeholder)
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                  ← Routes
    │   ├── main.jsx
    │   ├── api/axios.js             ← Axios instance with JWT interceptor
    │   ├── context/AuthContext.jsx  ← Auth state (login/logout)
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── OTPVerify.jsx
    │       ├── Dashboard.jsx        ← Batch list with status filters
    │       ├── NewBatch.jsx         ← Full batch logging form
    │       ├── BatchDetail.jsx      ← Batch view + QR display + recall modal
    │       ├── QRLabel.jsx          ← Printable QR label
    │       └── RecallManagement.jsx ← Manage all recalls
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm

---

## Setup Steps

### 1. Database

Create the database:
```bash
createdb foodtrace
```

Run the migration:
```bash
psql foodtrace -f backend/migrations/001_initial.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in your values (at minimum: `DATABASE_URL` and `JWT_SECRET`).

For email OTP to work, set your SMTP credentials. You can use Gmail with an App Password.

Start the backend:
```bash
npm run dev       # development (nodemon)
npm start         # production
```

Backend runs on: `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

The Vite dev server proxies `/api` requests to the backend automatically.

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (triggers OTP email) |
| POST | `/api/auth/verify-otp` | Confirm OTP → activate account |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current manufacturer (auth required) |

### Batches (all require JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batches` | Create batch + auto-generate QR code |
| GET | `/api/batches` | List batches (filter by status, paginated) |
| GET | `/api/batches/:id` | Get single batch |
| GET | `/api/batches/:id/scan` | Public scan endpoint (no auth, logs scan) |

### Recalls (all require JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recalls` | Issue a recall (instantly updates QR + notifies consumers) |
| GET | `/api/recalls` | List all your recalls |
| GET | `/api/recalls/:id` | Get single recall with notification count |
| PATCH | `/api/recalls/:id/resolve` | Mark recall as resolved |

---

## Connecting Real Services (when ready)

### AWS S3 (QR code storage)
1. Add AWS credentials to `.env`
2. Uncomment the S3 block in `backend/src/services/qrService.js`
3. Remove the local file save code below it

### Africa's Talking (SMS recall alerts)
1. Add `AT_API_KEY` and `AT_USERNAME` to `.env`
2. Run `npm install africastalking` in backend/
3. Uncomment the real implementation in `backend/src/services/smsService.js`

### Firebase FCM (push notifications)
1. Add `PUSH_SERVER_KEY` to `.env`
2. Uncomment the FCM fetch call in `backend/src/services/notificationService.js`

---

## How Recalls Work (the key flow)

1. Manufacturer goes to a batch → clicks "Issue Recall"
2. Backend sets `batches.status = 'recalled'` immediately
3. Any consumer scanning that QR code now sees a red RECALLED banner (via `/api/batches/:id/scan`)
4. Backend fetches all `qr_scans` for that batch from the last 90 days
5. Fires email + SMS + push notifications to all those consumers concurrently
6. Notification delivery is logged in `recall_notifications` table

---

## For Role 1 Integration

When Role 1's auth system is ready, swap out the `manufacturers` table auth for the shared users table. The JWT middleware in `src/middleware/auth.js` just needs the secret key — no other changes required.

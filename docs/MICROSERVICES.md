# FoodTrace GH — Microservices Architecture

Microservices is **how we structure the backend**, not a separate programming language. FoodTrace GH runs as **two Spring Boot microservices** that share PostgreSQL and serve different clients.

---

## One-page diagram (for FF2 / CODEQUEST)

```text
  Expo Mobile ──┐                      ┌─────────────────────────┐
  React Web ────┼──► Core API (:3000) ─┤  auth, farm, scan,      │
                │    Spring Boot       │  marketplace, manufacturer│
                │                      │  drug, notifications      │
                │                      └────────────┬──────────────┘
                │                                   │
                │                                   ▼
                │                            PostgreSQL
                │                                   ▲
                │                      ┌────────────┴──────────────┐
  Regulator ────┴──► Analytics (:8081)─┤  analytics, recalls,      │
  Dashboard          Spring Boot       │  USSD, SMS alerts         │
                                       └───────────────────────────┘
```

**Compulsory stacks used:** PostgreSQL · Spring Boot · Expo · TypeScript · Microservices (above)

---

## Service boundaries

| Microservice | Port | Owns | Does not own |
|---|---|---|---|
| **Core API** ([`backend/`](../backend/)) | `3000` | Auth/JWT, farms & crop cycles, product/drug scan, marketplace, manufacturer batches, notifications | Regulator chart aggregations, recall activation SMS, USSD webhook |
| **Analytics Service** ([`analytics-service/`](../analytics-service/)) | `8081` | Regulator KPIs/charts, recall workflow + evidence, **USSD** (`POST /api/ussd`), recall SMS alerts | Consumer login, farmer offline sync, marketplace posts |

### Why split this way?

- **Core** = day-to-day operational data (who logged in, what was scanned, what batch was packed).
- **Analytics** = regulator safety layer (aggregations, recall state machine, public USSD).
- Different **scale and risk**: scan traffic vs. heavy analytics queries; recalls/SMS can fail independently without taking down consumer login.
- Matches CODEQUEST “microservices architecture” while staying maintainable for a student team.

---

## Who calls what

| Client | Talks to | Base URL (local) |
|---|---|---|
| Expo mobile ([`mobile/`](../mobile/)) | Core API | `http://localhost:3000/api` |
| Main web ([`web/`](../web/)) | Core API | `http://localhost:3000/api` |
| Regulator dashboard ([`regulator-dashboard/`](../regulator-dashboard/)) | Analytics Service | `http://localhost:8081` |
| Africa’s Talking USSD callback | **Analytics only** | `https://<analytics-host>/api/ussd` |

There is **no API gateway** in the MVP. Clients call the service that owns the feature. Integration between services is via **shared PostgreSQL** (Core owns schema/migrations; Analytics reads operational tables and writes recall workflow data).

---

## Data flow examples

### Consumer scan (Core)

```text
Phone → Core API /api/scan → PostgreSQL product_batches → safety JSON → app UI
```

### Regulator activates recall (Analytics)

```text
Dashboard → Analytics /api/recalls/{id}/activate → DB recall status
                                         → Africa's Talking SMS to farmers
```

### Feature-phone USSD (Analytics)

```text
*code# → Africa's Talking → Analytics POST /api/ussd → menu text (CON/END)
```

---

## Local run (both microservices)

### Option A — Docker Compose (recommended demo)

From repo root (Postgres + Redis + Core + Analytics):

```bash
docker compose up --build
```

- Core: `http://localhost:3000/health`
- Analytics: `http://localhost:8081/api/health`

Analytics is configured in compose to use the **same Postgres** as Core (`SQL_INIT_MODE=never` so Core/Flyway owns the schema).

### Option B — Manual

```bash
# Terminal 1 — Core (Flyway migrations)
npm run dev:backend

# Terminal 2 — Analytics against same DB
cd analytics-service
set DB_URL=jdbc:postgresql://localhost:5432/foodtrace_gh
set DB_USERNAME=foodtrace
set DB_PASSWORD=foodtrace
set DB_DRIVER=org.postgresql.Driver
set SQL_INIT_MODE=never
mvn spring-boot:run
```

(On Unix use `export` instead of `set`.)

---

## USSD ownership rule

| Service | USSD endpoint |
|---|---|
| Analytics | **Enabled** — point Africa’s Talking here |
| Core | **Disabled by default** (`foodtrace.ussd.enabled=false`) to avoid two services answering the same webhook |

To temporarily re-enable Core USSD for legacy tests: set `USSD_ENABLED=true` on the Core process.

---

## How to explain this in the oral exam

1. “We use a **microservices architecture**: two Spring Boot services, not one monolith.”
2. “**Core API** handles auth, farms, scans, marketplace. **Analytics Service** handles regulator charts, recalls, and USSD.”
3. “They share **PostgreSQL**; clients call the service that owns the feature.”
4. “This satisfies CODEQUEST: PostgreSQL, Spring Boot, Expo, TypeScript, and microservices.”

---

## Related docs

- [architecture.md](architecture.md) — Role 5 (regulator) deep dive  
- [BUSINESS_MODEL.md](BUSINESS_MODEL.md) — how the product makes money  
- [ROLE5_REGULATOR_DASHBOARD.md](ROLE5_REGULATOR_DASHBOARD.md) — dashboard + analytics runbook  

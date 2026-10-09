# Airbnb clone — full-stack assignment

A photo-first homes marketplace built with **Next.js + TypeScript**, **FastAPI**, and **SQLite**. Includes destination/date/guest search, filters and pagination, listing galleries, availability selection, mocked checkout, persistent trips, host listing CRUD, incoming reservations, and favorites.

Independent assignment demo. Authentication and checkout are simulated; no actual payment is collected.

Source repository: [garvi911/airbnb-clone--scaler-ai](https://github.com/garvi911/airbnb-clone--scaler-ai). Hosted demo: pending deployment.

## Run locally

Requirements: Node.js 22+ and Python 3.12+. Open two terminals from the repository root.

### Backend — Windows PowerShell

```powershell
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m app.seed
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On macOS/Linux use `python3 -m venv .venv` and replace `.venv/Scripts/python.exe` with `.venv/bin/python` in subsequent commands.

### Frontend — second terminal

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:3000**. Interactive API documentation: **http://127.0.0.1:8000/docs**.

Production check: `npm run build`, then `npm start` in `frontend/`, with the backend running separately.

## Environment

Defaults work locally without environment files; examples are included in each application directory.

| Variable | Default | Purpose |
|---|---|---|
| `API_URL` | `http://127.0.0.1:8000` | Next.js API proxy destination; set before building |
| `DATABASE_PATH` | `backend/airbnb.db` | SQLite file; use a persistent disk in deployment |
| `FRONTEND_ORIGINS` | `http://localhost:3000` | Comma-separated origins for direct backend requests |

Next.js reads `frontend/.env.local`. For Python, export variables in the shell; `.env.example` is documentation, not automatically loaded. Example: `$env:DATABASE_PATH='C:/data/airbnb.db'` in PowerShell, or `export DATABASE_PATH=/data/airbnb.db` on Linux.

## Demo usage

The top-right account menu changes demo users:

- **Ananya (1):** initial guest; can also create listings.
- **Arjun (2)** and **Meera (3):** owners of seeded properties.
- **Kabir (4):** guest with seeded reservations.

All users may browse, book, save favorites, or host. Hosting navigation does not change identity or grant ownership. The API accepts `X-User-Id` as deliberately mocked identity; it is not production authentication.

Seed data: 24 listings, 4 users, 48 reviews, 24 reservations. Seeding an initialized database leaves data unchanged. Normal API startup only creates missing tables. The container runs the non-destructive seed before starting.

## Architecture

```text
Browser -> Next.js UI and same-origin /api proxy
          -> FastAPI validation, ownership and booking rules
             -> SQLite foreign keys, WAL and transactions
```

| Directory/file | Responsibility |
|---|---|
| `frontend/src/app/` | Root layout, routes, styles |
| `frontend/src/components/` | Feature screens and reusable UI |
| `frontend/src/lib/api.ts` | Typed API client, models and formatting |
| `frontend/public/stays/` | Bundled demo photographs |
| `frontend/tests/` | Browser workflow tests |
| `backend/app/main.py` | HTTP routes, validation and business rules |
| `backend/app/database.py` | Connections, schema and indexes |
| `backend/app/seed.py` | Repeatable seed |
| `backend/tests/` | API workflow tests |
| `deploy/start.py` | Container process lifecycle |

The Next.js catch-all route dispatches to separate feature components. URL parameters preserve search criteria. All data operations go through Python; browser storage holds only the demo-user preference.

## Database schema

| Table | Key columns and relationships |
|---|---|
| users | id, name, initials, bio |
| listings | id, host_id -> users, description, location, type/category, price, capacity, bedrooms, bathrooms, active |
| images | id, listing_id -> listings, URL, display order |
| amenities | id, unique name |
| listing_amenities | composite primary key (listing_id, amenity_id), both foreign keys |
| reviews | id, listing/user foreign keys, rating 1–5, comment, date |
| bookings | id, listing/guest foreign keys, dates, guests, price/property snapshots, request key |
| favorites | composite primary key (user_id, listing_id), both foreign keys |

Indexes cover booking overlap, guest trips and host listings. Foreign keys are enabled per connection. `(guest_id, request_key)` is unique on bookings.

## Booking and listing rules

- Dates are date-only, check-in inclusive and check-out exclusive; same-day turnover is valid. Past check-in and zero-night stays are rejected.
- Overlap means `existing.check_in < requested.check_out AND existing.check_out > requested.check_in`.
- `BEGIN IMMEDIATE` serializes writers before checking availability and inserting; conflicting requests cannot both reserve the same home.
- Prices use integer paise. The backend computes subtotal and a **mock 10% service fee**, rounded to nearest paise. No additional tax. This is an assignment assumption, not Airbnb pricing policy.
- Client totals are ignored. Booking snapshots preserve accepted price, title, location and cover photo.
- Repeating the same checkout request key returns its existing reservation.
- Guest counts must fit capacity; filters combine before pagination; amenities use AND matching.
- Listing deletion is a soft delete. Discovery and new bookings exclude it; existing trips and host history survive.
- Listing changes require ownership. Trips and favorites are scoped to the demo identity.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /health, /users, /amenities | Health and demo metadata |
| GET | /listings | Search/filter/paginate |
| GET | /listings/{id} | Details, gallery, host, amenities, reviews |
| GET | /listings/{id}/availability | Occupied dates |
| POST | /bookings/quote | Validate and calculate price |
| POST | /bookings | Atomically reserve |
| GET | /bookings/{id}, /me/bookings | Guest reservation/trips |
| GET | /me/listings, /me/host-bookings | Host dashboard |
| POST | /listings | Create listing |
| PUT / DELETE | /listings/{id} | Update/soft-delete |
| GET | /me/favorites | Saved listings |
| PUT / DELETE | /me/favorites/{id} | Save/remove favorite |

Search accepts `location`, `check_in`, `check_out`, `guests`, `category`, `property_type`, `min_price`, `max_price`, `amenities` (comma-separated), `page`, `page_size`. Prices use paise. Full request/response schemas appear in `/docs`.

## Verification

From `backend/`: `.venv/Scripts/python.exe -m pytest -q` (use `.venv/bin/python` on Unix). Tests use temporary SQLite databases.

From `frontend/`:

```bash
npm run build
npm run typecheck
npx playwright test
```

Browser tests expect frontend/backend running and installed Chrome. For bundled Chromium, run `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`. Use a demo database: these tests create a clearly named test home, reserve it, delete it, and verify historical trips. Afterwards, from `backend/`, run the project Python with `-m tests.cleanup_browser_data` to remove only these named fixtures.

Checks cover combined search, pagination, favorites, host CRUD, confirmation/reload, trip history, ownership, invalid inputs, overlap, adjacent stays, concurrent booking, idempotency, price snapshots, and rollback.

## Deployment

The Dockerfile runs Next.js and FastAPI together. Python is internal; Next.js exposes the UI and proxies `/api`. SQLite must use a persistent volume. Health check: `/api/health`.

```bash
docker build -t airbnb-assignment .
docker run --name airbnb-assignment -p 3000:3000 -v airbnb-data:/data airbnb-assignment
```

`render.yaml` configures a Docker web service with a persistent disk. It specifies the paid `0.5c-512mb` instance; review current provider pricing before provisioning. No paid service has been created. Keep one backend instance with its disk, not independent database copies across replicas. Configuration references: [Render Blueprint](https://render.com/docs/blueprint-spec) and [persistent disks](https://render.com/docs/disks).

Submit a public GitHub repository and working hosted URL after deployment and restart-persistence verification. Live URLs are not claimed until deployment succeeds.

## Scope and assumptions

Core assignment features only. Authentication and checkout are mocked; reviews are seeded; photos use bundled assets or host URLs. Messaging, identity verification, live maps, review submission, cloud uploads, dark mode, cancellations and refunds are not implemented. Location appears as text; a live map is not required. Layouts include basic narrow-screen usability.

Demo photos are bundled from Unsplash; source IDs and the one-time downloader are in `backend/app/seed.py` and `backend/download_demo_photos.py`. Host photo URLs remain external; failed images show a local placeholder.

Visuals follow the assignment's Airbnb-inspired cards, search, gallery and reservation patterns; exact pixel parity is not asserted. Code was independently implemented rather than copied from a clone repository.

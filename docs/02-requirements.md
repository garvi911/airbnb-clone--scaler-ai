# Requirements and acceptance checklist

Source: `C:\Users\garvi\Downloads\Assignment Airbnb Clone.pdf`. The user subsequently authorized the full implementation, limited to the assignment scope. Current delivery status is recorded below.

## Required scope

| ID | Feature | Acceptance evidence |
|---|---|---|
| R01 | Next.js + TypeScript frontend, Python backend, SQLite | Source contains frontend/ and backend/; application reads and writes SQLite through Python API |
| R02 | Explore cards | Each card shows photo, title, location, nightly price, rating; opens correct detail page |
| R03 | Location/date/guest search | Combined criteria return matching locations, sufficient capacity, and available dates |
| R04 | Filters and categories | Price, property type, amenities and category combine; clearing restores results |
| R05 | Pagination or infinite scroll | Implement pagination; stable results, correct total/pages, filters reset page |
| R06 | Listing detail | Gallery, description, location, amenities, host, reviews all match selected listing |
| R07 | Calendar and quote | Unavailable dates displayed; valid range and guests produce nightly subtotal plus defined fees |
| R08 | End-to-end booking | Mock checkout creates stored reservation; confirmation reloads it from backend |
| R09 | Availability enforcement | Overlap rejected server-side, including concurrent requests; adjacent stays permitted |
| R10 | My Trips | Only selected demo user's trips appear and survive refresh/restart |
| R11 | Host creation | Valid property and photo URLs persist and become discoverable |
| R12 | Host editing/deletion | Only owner may change listing; changes persist; deletion preserves booked history |
| R13 | Host dashboard | Owned listings and reservations received are shown; other hosts' records excluded |
| R14 | Favorites | Save/remove from card or details; user-specific favorites persist and stay synchronized |
| R15 | Airbnb experience | Consistent navigation, photo-first layouts, galleries, date picker, dialogs, feedback toasts |
| R16 | Seed data | Fresh setup provides varied photographed properties, multiple hosts, reviews and existing bookings |
| R17 | Documentation | README covers setup, stack, architecture, schema, API, assumptions, mock behavior |
| R18 | Delivery | Public source repository with frontend/ and backend/ plus working hosted demo link |
| R19 | Original work and understanding | Original implementation; documented decisions; explainable booking and ownership logic |

## Implementation tracking

- [x] R01–R05: foundation and discovery; production build and search tests pass.
- [x] R06–R10: detail and booking; API and browser journeys pass.
- [x] R11–R14: host tools and favorites; API and browser CRUD checks pass.
- [x] R15–R16: required UI patterns, 24 seeded listings and bundled photos; screenshots inspected. Exact pixel parity is not claimed.
- [x] R17: setup, architecture, schema, APIs and assumptions documented in README.
- [ ] R18: source pushed to https://github.com/garvi911/airbnb-clone--scaler-ai on main; hosted deployment still pending.
- [x] R19: original implementation and explainable design decisions documented; candidate interview preparation remains the candidate's responsibility.

## Explicitly permitted simplifications

- Simulated checkout; no payment provider, card collection, or money transfer.
- Demo-user selection instead of production authentication; label clearly as demo behavior.
- Photo URLs instead of upload infrastructure.
- Seeded reviews; writing reviews is optional.
- Static/basic location map; no geocoding dependency.
- Messaging and identity verification may show Coming Soon.
- All media and external services may be mocked.

## Optional in the assignment

Interactive map pins, completed-stay reviews, Superhost/rating aggregation, cloud image uploads, dark mode, and responsive design. Project decision: include practical responsive behavior; defer other bonuses until required criteria pass. Seeded rating display remains required even though automatic aggregation is optional.

## Proposed business rules (implementation decisions)

- Default demo currency: INR, formatted consistently; store monetary amounts in integer paise.
- Date-only stays use [check-in, check-out); at least one night; no past check-in.
- Overlap: existing.check_in < requested.check_out AND existing.check_out > requested.check_in.
- Positive integer guest count cannot exceed capacity.
- Proposed mock fee: service fee 10% of nightly subtotal, rounded to nearest paise; no additional tax. Label and document this as demo pricing, not Airbnb policy.
- Server computes quote and final total; reservation stores price snapshot.
- Revalidate in a transaction on booking; conflicting simultaneous requests cannot both succeed.
- Repeated submission of the same checkout operation returns the same result rather than creating another booking.
- Soft-delete listings: exclude from discovery/new booking; retain previous trip details.
- Guest/host mode changes navigation, never ownership. Demo identity is deliberately impersonable and is not production security.
- No cancellation or refund workflow is required for the initial delivery.

## Verification plan

Backend checks: combined search, pagination boundaries, invalid date ranges, guest limits, overlap/adjacency, concurrent booking, duplicate submission, price tampering, ownership, persistence and deletion history.

Browser checks: search -> detail -> checkout -> confirmation -> trips; switch to owner -> create/edit listing -> verify explore; favorite synchronization; unavailable calendar; recoverable error and empty states; keyboard and mobile smoke checks.

Delivery checks: frontend production build; backend tests; clean setup from README; deployed nested routes, API and images; data survives backend restart; seeding is explicit and non-destructive at normal startup.

## Build milestones

1. Foundation: running frontend/API and schema.
2. Discovery: seed, search API, explore and listing details.
3. Booking: quote, atomic reservation, confirmation and trips.
4. Host and favorites: complete persistent CRUD and saved listings.
5. Quality: regression checks, visual review and responsive behavior.
6. Delivery: documentation, persistent deployment and submission links.

The brief estimates approximately 24 work hours; this is guidance, not a guaranteed deadline. Actual submission deadline was not included in the PDF.

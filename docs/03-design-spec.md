# Screens, interactions, and visual system

Prepared 9 October 2026. This is an implementation specification, not a claim of measured pixel parity.

## Reference study and evidence

Reference inspected: [Airbnb home](https://www.airbnb.com/), accessed 9 October 2026 through public page text. Verified observations: destination/date/guest search, a host entry point, account access, and navigation for homes plus other offerings. The assignment is scoped to homes.

The live browser failed to initialize. The [Goa search reference](https://www.airbnb.com/s/Goa--India/homes) was unavailable through text retrieval. Consequently, no screenshots, exact geometry, live listing details, checkout, or host screens have been visually verified. Values below are proposed design targets. Repeat visual inspection when browser access works, before claiming reference fidelity.

Reference review backlog:
- [ ] Capture desktop home/search results and inspect card/grid proportions.
- [ ] Inspect detail gallery, reservation panel and review layout.
- [ ] Inspect search, filters and date-selection interactions.
- [ ] Check accessible checkout reference without making a reservation.
- [ ] Compare mobile navigation and booking affordances.

## Visual direction

Photo-forward marketplace with a white canvas, dark neutral text, subdued metadata, fine dividers, generous whitespace, rounded photographs and pink primary actions. No decorative hero that pushes listings below the fold. Keep core homes search and the assignment's category/filter row even if the live homepage varies.

Proposed tokens (not measurements from Airbnb):

| Token | Specification |
|---|---|
| Canvas / surface | #FFFFFF / #F7F7F7 |
| Text / muted text | #222222 / #717171 |
| Divider | #DDDDDD |
| Brand / action | #FF385C / #D90B63; use darker action tone for white text and check contrast |
| Error | #B32505, always paired with text |
| Font | System sans-serif initially; do not depend on unavailable proprietary fonts |
| Type sizes | 12 labels, 14 metadata, 16 body, 22 section title, 32 page title |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64 px |
| Radii | 12 px controls/cards; 16 px large surfaces; pill search |
| Explore width | Up to 1600 px; 40–64 px desktop gutters |
| Detail width | Up to 1120 px centered |
| Touch targets | At least 44 x 44 px for primary interactive controls |
| Card image | Approximately square; object-fit cover; heart upper-right |
| Elevation | Restrained shadow on search, dialogs and reservation panel |

## Route and screen specification

| Route | Layout and content | Main actions |
|---|---|---|
| / | Header, large search, category/filter strip, photo grid, pagination | Search, filter, save, open listing |
| /listings/[id] | Title, gallery, two-column content + reservation panel, amenities, reviews, location | View photos, select dates/guests, reserve, save |
| /bookings/checkout | Back navigation, dates/guests and demo checkout left, price summary right | Edit trip, confirm simulated booking |
| /bookings/[id]/confirmation | Confirmation message, persisted stay summary and booking reference | View trips, return to property |
| /trips | Upcoming/past trip cards and empty state | View reservation |
| /wishlists | Saved listing grid and empty state | Open or remove favorite |
| /host | Host navigation, owned listings, incoming bookings | Create, edit, delete |
| /host/listings/new | Grouped listing form and photo preview | Validate and create |
| /host/listings/[id]/edit | Same form populated with existing data | Save changes or delete |

## Desktop layout sketches

Explore:
```
[brand]             [homes]                  [host] [demo user]
             [Where | Check-in/out | Guests | Search]
[category controls................................] [Filters]
[photo/card] [photo/card] [photo/card] [photo/card]
[photo/card] [photo/card] [photo/card] [photo/card]
                        [pagination]
```

Details:
```
[title........................................] [Save]
[large photograph........] [small photo] [small photo]
[........................] [small photo] [all photos]
[host + capacity.........] [nightly price...........]
[description.............] [dates / guests..........]
[amenities...............] [Reserve.................]
[reviews.................] [price breakdown.........]
[location................]
```

## Interaction contracts

Search: destination field, date range and guest count; apply writes URL parameters. Preserve criteria when opening a listing and returning. Category changes and filters reset page to 1.

Filters: draft changes inside a dialog; Apply commits together; Clear resets draft; dismiss without applying preserves active filters. Selected amenities use AND matching. State active filter count explicitly.

Calendar: two months on desktop, one on small screens; disabled past dates and booked nights; valid checkout boundary remains selectable. Reject ranges that cross blocked nights. Keyboard operation and clear dates action required. Server remains availability authority.

Guests: integer stepper with explicit minimum/maximum and disabled bounds. Use one total guest count in initial scope rather than inventing child/infant pricing rules.

Reserve: require dates and guest count; fetch authoritative quote; carry inputs to checkout. On conflict, retain useful input and show date reselection guidance. Never show success until reservation persists.

Favorites: visible selected state, accessible label, user-specific persistence; recover or roll back UI on failed save.

Gallery: ordered images; expanded dialog with previous/next, Escape close, visible close button and restored focus.

Host form: grouped basics, location, capacity/type, price, photos, amenities; inline validation; preview URL images with fallback. Warn before discarding unsaved changes.

Deletion: confirmation names the property; explain that existing reservations remain in history. Remove from browse after success.

Demo identity: explicit Demo label. Identity change refreshes user-specific data and clears pending checkout identity assumptions. Host/guest navigation switch is separate from identity.

## Responsive behavior

- Below 640 px: 16–24 px gutters, one-column grid, compact search that opens a sheet, one-column detail, sticky bottom reservation action, no horizontal overflow.
- 640–1023 px: two or three card columns depending on usable width; single-column checkout when needed.
- 1024 px and above: four or more explore columns as card width permits; two-column details and checkout.
- Dialogs become near-full-screen sheets on small screens; sticky controls must not obscure fields or page content.

## Shared components and state coverage

Header, DemoUserMenu, SearchBar, CategoryRow, FiltersDialog, ListingCard, FavoriteButton, DateRangePicker, GuestCounter, PhotoGallery, PriceBreakdown, ReservationPanel, ListingForm, TripCard, Pagination, Dialog, Toast, Skeleton and EmptyState.

Each fetching screen needs loading, success, empty, and recoverable error states. Detail/confirmation also need missing or inaccessible record states. Each mutation needs pending, validation error, server failure and confirmed success feedback. Block repeated submits while pending.

## Visual acceptance gate

- Review at 390, 768 and 1440 px widths.
- Cards use consistent image crops, typography and spacing.
- Currency and price labels agree across card, quote, checkout and confirmation.
- Dialog focus is trapped and restored; all controls have accessible names; focus is visible.
- No broken images, clipped controls, horizontal overflow or sticky elements hiding content.
- Capture implementation screenshots and compare with accessible references; document remaining differences honestly.
- UI text identifies this as an assignment demo and payment as simulated.

"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Grid2X2,
  Star,
  KeyRound,
  MapPin,
  Wifi,
  CookingPot,
  Waves,
  Car,
  Wind,
  Laptop,
  Trees,
  Heart,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { api, Listing, Quote, Range, money, prettyDate } from "@/lib/api";
import { ErrorState, Loading, Modal, Photo } from "./ui";
import { Calendar, GuestCounter } from "./calendar";
import { useSession } from "./session";

export function PriceBreakdown({ quote }: { quote: Quote }) {
  return (
    <div className="price-breakdown">
      <div>
        <span>
          {money(quote.nightly_price)} × {quote.nights} nights
        </span>
        <span>{money(quote.subtotal)}</span>
      </div>
      <div>
        <span>Service fee</span>
        <span>{money(quote.fee)}</span>
      </div>
      <div className="price-total">
        <strong>Total</strong>
        <strong>{money(quote.total)}</strong>
      </div>
    </div>
  );
}

export default function Detail({ id }: { id: number }) {
  const params = useSearchParams(),
    router = useRouter(),
    { favorites, toggle } = useSession();
  const [listing, setListing] = useState<Listing | null>(null),
    [blocked, setBlocked] = useState<Range[]>([]),
    [error, setError] = useState("");
  const [start, setStart] = useState(params.get("check_in") || ""),
    [end, setEnd] = useState(params.get("check_out") || ""),
    [guests, setGuests] = useState(Number(params.get("guests") || 1));
  const [quote, setQuote] = useState<Quote | null>(null),
    [quoteError, setQuoteError] = useState(""),
    [modal, setModal] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Listing>(`/listings/${id}`),
      api<Range[]>(`/listings/${id}/availability`),
    ])
      .then(([l, b]) => {
        if (active) {
          setListing(l);
          setBlocked(b);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    let active = true;
    setQuote(null);
    setQuoteError("");
    if (start && end)
      api<Quote>("/bookings/quote", {
        method: "POST",
        body: JSON.stringify({
          listing_id: id,
          check_in: start,
          check_out: end,
          guests,
        }),
      })
        .then((q) => {
          if (active) setQuote(q);
        })
        .catch((e) => {
          if (active) setQuoteError(e.message);
        });
    return () => {
      active = false;
    };
  }, [id, start, end, guests]);
  if (error)
    return (
      <main className="content">
        <ErrorState message={error} />
      </main>
    );
  if (!listing) return <Loading />;
  const amenityIcons: Record<string, typeof Wifi> = {
    Wifi: Wifi,
    Kitchen: CookingPot,
    Pool: Waves,
    "Free parking": Car,
    "Air conditioning": Wind,
    Workspace: Laptop,
    Garden: Trees,
  };
  const reserve = () => {
    if (!start || !end) {
      setModal("dates");
      return;
    }
    if (!quote) return;
    router.push(
      "/bookings/checkout?" +
        new URLSearchParams({
          listing_id: String(id),
          check_in: start,
          check_out: end,
          guests: String(guests),
        }),
    );
  };
  return (
    <main className="detail content">
      <Link href="/" className="back-link">
        <ArrowLeft size={17} />
        All homes
      </Link>
      <div className="title-row">
        <h1>{listing.title}</h1>
        <button className="text-button save-link" onClick={() => toggle(id)}>
          <Heart size={17} fill={favorites.includes(id) ? "#ff385c" : "none"} />
          {favorites.includes(id) ? "Saved" : "Save"}
        </button>
      </div>
      <div className="detail-meta">
        <Star size={14} fill="currentColor" />
        <strong>{listing.rating?.toFixed(2) || "New"}</strong>
        <a href="#reviews">{listing.reviews.length} reviews</a>
        <span>·</span>
        <span>{listing.location}</span>
      </div>
      <div className={`gallery photos-${Math.min(5, listing.images.length)}`}>
        {Array.from({ length: Math.min(5, listing.images.length) }, (_, i) => (
          <button
            key={i}
            onClick={() => setModal("photos")}
            aria-label={`View photo ${i + 1}`}
          >
            <Photo
              src={listing.images[i]}
              alt={`${listing.title} · photo ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </button>
        ))}
        <button className="all-photos" onClick={() => setModal("photos")}>
          <Grid2X2 size={15} />
          Show all photos
        </button>
      </div>
      <div className="detail-columns">
        <div className="detail-body">
          <section>
            <h2>
              {listing.property_type} in {listing.location}
            </h2>
            <p>
              {listing.capacity} guests · {listing.bedrooms} bedrooms ·{" "}
              {listing.bathrooms} bathrooms
            </p>
          </section>
          <section className="host-intro">
            <span className="avatar">{listing.host.initials}</span>
            <div>
              <strong>Hosted by {listing.host.name}</strong>
              <p className="muted">Your local host</p>
            </div>
          </section>
          <section className="highlights">
            <div>
              <KeyRound />
              <div>
                <strong>Make yourself at home</strong>
                <p className="muted">Enjoy the entire place to yourself.</p>
              </div>
            </div>
            <div>
              <MapPin />
              <div>
                <strong>A lovely place to get away</strong>
                <p className="muted">
                  Explore {listing.location.split(",")[0]} at your own pace.
                </p>
              </div>
            </div>
          </section>
          <section>
            <h2>About this space</h2>
            <p className="description">{listing.description}</p>
          </section>
          <section>
            <h2>What this place offers</h2>
            <div className="amenities">
              {listing.amenities.map((a) => {
                const Icon = amenityIcons[a] || ShieldCheck;
                return (
                  <div key={a}>
                    <Icon size={23} strokeWidth={1.5} />
                    {a}
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <h2>
              {quote
                ? `${quote.nights} nights in ${listing.location.split(",")[0]}`
                : "Choose your dates"}
            </h2>
            <p className="muted">
              {start && end
                ? `${prettyDate(start)} – ${prettyDate(end)}`
                : "Add your travel dates for exact pricing"}
            </p>
            <Calendar
              start={start}
              end={end}
              blocked={blocked}
              onChange={(s, e) => {
                setStart(s);
                setEnd(e);
              }}
            />
          </section>
        </div>
        <aside>
          <div className="reservation">
            <div className="reservation-price">
              <div>
                <strong>{money(listing.price)}</strong> <span>night</span>
              </div>
              <span>
                <Star size={12} fill="currentColor" />
                {listing.rating?.toFixed(2) || "New"}
              </span>
            </div>
            <div className="booking-inputs">
              <button onClick={() => setModal("dates")}>
                <b>CHECK-IN</b>
                <span>{start ? prettyDate(start) : "Add date"}</span>
              </button>
              <button onClick={() => setModal("dates")}>
                <b>CHECKOUT</b>
                <span>{end ? prettyDate(end) : "Add date"}</span>
              </button>
              <button
                className="guest-input"
                onClick={() => setModal("guests")}
              >
                <b>GUESTS</b>
                <span>
                  {guests} guest{guests !== 1 ? "s" : ""}
                </span>
              </button>
            </div>
            {quoteError && (
              <p className="form-error" role="alert">
                {quoteError}
              </p>
            )}
            <button
              className="button primary full"
              disabled={Boolean(start && end && !quote)}
              onClick={reserve}
            >
              {start && end ? "Reserve" : "Check availability"}
            </button>
            <p className="no-charge">You won’t be charged yet</p>
            {quote && <PriceBreakdown quote={quote} />}
          </div>
          <p className="demo-note">Mock checkout · no actual payment</p>
        </aside>
      </div>
      <section className="reviews-section" id="reviews">
        <h2>
          <Star size={22} fill="currentColor" />{" "}
          {listing.rating?.toFixed(2) || "New"} · {listing.reviews.length}{" "}
          reviews
        </h2>
        <div className="reviews-grid">
          {listing.reviews.length ? (
            listing.reviews.map((r) => (
              <article key={r.id}>
                <div className="host-intro">
                  <span className="avatar small">{r.initials}</span>
                  <div>
                    <strong>{r.name}</strong>
                    <p className="muted">{prettyDate(r.created_at)}</p>
                  </div>
                </div>
                <p className="review-stars">{"★".repeat(r.rating)}</p>
                <p>{r.comment}</p>
              </article>
            ))
          ) : (
            <p className="muted">Be one of the first guests to stay here.</p>
          )}
        </div>
      </section>
      <section className="host-about">
        <h2>Meet your host</h2>
        <div className="host-intro">
          <span className="avatar">{listing.host.initials}</span>
          <div>
            <h3>{listing.host.name}</h3>
            <p>{listing.host.bio}</p>
          </div>
        </div>
      </section>
      <Modal
        open={modal === "dates"}
        onClose={() => setModal("")}
        title="Select dates"
      >
        <Calendar
          start={start}
          end={end}
          blocked={blocked}
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
        <button
          className="button dark full"
          disabled={Boolean(start && !end)}
          onClick={() => setModal("")}
        >
          Save dates
        </button>
      </Modal>
      <Modal
        open={modal === "guests"}
        onClose={() => setModal("")}
        title="Guests"
      >
        <GuestCounter
          value={guests}
          max={listing.capacity}
          onChange={setGuests}
        />
        <button className="button dark full" onClick={() => setModal("")}>
          Done
        </button>
      </Modal>
      <Modal
        open={modal === "photos"}
        onClose={() => setModal("")}
        title={listing.title}
      >
        <div className="expanded-gallery">
          {listing.images.map((src, i) => (
            <Photo key={i} src={src} alt={`Property photograph ${i + 1}`} />
          ))}
        </div>
      </Modal>
    </main>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, LockKeyhole, Star } from "lucide-react";
import {
  api,
  Booking,
  Listing,
  money,
  prettyDate,
  Quote,
  today,
} from "@/lib/api";
import { useSession } from "./session";
import { Empty, ErrorState, Loading, Photo } from "./ui";
import { PriceBreakdown } from "./detail";

export function Checkout() {
  const params = useSearchParams(),
    router = useRouter(),
    { user, users } = useSession();
  const [listing, setListing] = useState<Listing | null>(null),
    [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = useRef(""),
    sending = useRef(false);
  const id = Number(params.get("listing_id")),
    start = params.get("check_in") || "",
    end = params.get("check_out") || "",
    guests = Number(params.get("guests") || 1);
  const body = { listing_id: id, check_in: start, check_out: end, guests };
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, [user, id, start, end, guests]);
  useEffect(() => {
    let active = true;
    setError("");
    setQuote(null);
    Promise.all([
      api<Listing>(`/listings/${id}`),
      api<Quote>("/bookings/quote", {
        method: "POST",
        body: JSON.stringify({
          listing_id: id,
          check_in: start,
          check_out: end,
          guests,
        }),
      }),
    ])
      .then(([l, q]) => {
        if (active) {
          setListing(l);
          setQuote(q);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, start, end, guests]);
  const confirm = async () => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const b = await api<Booking>(
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({ ...body, request_key: key.current }),
        },
        user,
      );
      router.push(`/bookings/${b.id}/confirmation`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      sending.current = false;
    }
  };
  const back = `/listings/${id}?${new URLSearchParams({ check_in: start, check_out: end, guests: String(guests) })}`;
  if (!listing || !quote)
    return error ? (
      <main className="content">
        <ErrorState message={error} />
        <Link href={back} className="text-button">
          Choose different dates
        </Link>
      </main>
    ) : (
      <Loading />
    );
  return (
    <main className="content checkout">
      <Link className="back-link" href={back}>
        <ArrowLeft size={19} />
        Back to your stay
      </Link>
      <h1>Confirm and book</h1>
      <div className="checkout-columns">
        <div>
          <section>
            <h2>Your trip</h2>
            <div className="trip-line">
              <div>
                <h3>Dates</h3>
                <p>
                  {prettyDate(start)} – {prettyDate(end)}
                </p>
              </div>
              <Link href={back}>Edit</Link>
            </div>
            <div className="trip-line">
              <div>
                <h3>Guests</h3>
                <p>
                  {guests} guest{guests !== 1 ? "s" : ""}
                </p>
              </div>
              <Link href={back}>Edit</Link>
            </div>
          </section>
          <section>
            <h2>Pay with</h2>
            <div className="mock-payment">
              <LockKeyhole size={24} />
              <div>
                <strong>Demo checkout</strong>
                <p>No card details needed. No actual payment will be made.</p>
              </div>
              <Check size={20} />
            </div>
          </section>
          <section>
            <h2>
              Booking as{" "}
              {users.find((u) => u.id === user)?.name || "demo guest"}
            </h2>
            <p className="muted">
              This assignment uses demo accounts. Your reservation will be saved
              to this user’s trips.
            </p>
          </section>
          <p className="checkout-disclaimer">
            Confirming reserves these dates in this demo. The service fee is a
            simulated 10% charge.
          </p>
          {error && (
            <div className="form-error" role="alert">
              {error} <Link href={back}>Change dates</Link>
            </div>
          )}
          <button className="button primary" disabled={busy} onClick={confirm}>
            {busy ? "Confirming…" : "Confirm and book"}
          </button>
        </div>
        <aside className="checkout-summary">
          <div className="summary-property">
            <Photo src={listing.images[0]} alt={listing.title} />
            <div>
              <p className="muted">{listing.property_type}</p>
              <h3>{listing.title}</h3>
              <p>
                <Star size={12} fill="currentColor" />{" "}
                {listing.rating?.toFixed(2) || "New"} · {listing.location}
              </p>
            </div>
          </div>
          <h2>Price details</h2>
          <PriceBreakdown quote={quote} />
        </aside>
      </div>
    </main>
  );
}

export function Confirmation({ id }: { id: number }) {
  const { user } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBooking(null);
    setError("");
    api<Booking>(`/bookings/${id}`, {}, user)
      .then((b) => {
        if (active) setBooking(b);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, user]);
  if (error)
    return (
      <main className="content">
        <ErrorState message={error} />
      </main>
    );
  if (!booking) return <Loading />;
  return (
    <main className="confirmation content">
      <span className="success-icon">
        <Check size={34} />
      </span>
      <p className="eyebrow">RESERVATION CONFIRMED</p>
      <h1>You’re going to {booking.location.split(",")[0]}!</h1>
      <p className="muted">
        Your next little escape is booked. Let the countdown begin.
      </p>
      <article className="confirmation-card">
        <Photo src={booking.image_url} alt={booking.listing_title} />
        <div>
          <h2>{booking.listing_title}</h2>
          <p>{booking.location}</p>
          <div className="confirmation-dates">
            <div>
              <small>CHECK-IN</small>
              <strong>{prettyDate(booking.check_in)}</strong>
            </div>
            <div>
              <small>CHECKOUT</small>
              <strong>{prettyDate(booking.check_out)}</strong>
            </div>
          </div>
          <p>
            {booking.guests} guests · {booking.nights} nights · Reference AB
            {String(booking.id).padStart(5, "0")}
          </p>
          <PriceBreakdown quote={booking} />
        </div>
      </article>
      <Link href="/trips" className="button primary">
        View my trips
      </Link>
      <p className="demo-note">Demo reservation · no payment was taken</p>
    </main>
  );
}

export function Trips() {
  const { user } = useSession();
  const [data, setData] = useState<Booking[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api<Booking[]>("/me/bookings", {}, user)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user]);
  return (
    <main className="content collection">
      <h1>Trips</h1>
      <p className="muted">Your stays, all in one place.</p>
      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <Loading />
      ) : !data.length ? (
        <Empty
          title="No trips booked… yet!"
          description="Time to dust off your bags and start planning your next adventure."
          action="Start searching"
        />
      ) : (
        ["Upcoming", "Past"].map((group) => {
          const rows = data.filter((b) =>
            group === "Upcoming"
              ? b.check_out >= today()
              : b.check_out < today(),
          );
          return rows.length ? (
            <section key={group}>
              <h2>{group} trips</h2>
              <div className="trip-grid">
                {rows.map((b) => (
                  <Link
                    href={`/bookings/${b.id}/confirmation`}
                    className="trip-card"
                    key={b.id}
                  >
                    <Photo src={b.image_url} alt={b.listing_title} />
                    <div>
                      <h3>{b.location.split(",")[0]}</h3>
                      <p>{b.listing_title}</p>
                      <p className="muted">
                        {prettyDate(b.check_in)} – {prettyDate(b.check_out)}
                      </p>
                      <strong>
                        {money(b.total)} · {b.guests} guests
                      </strong>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null;
        })
      )}
    </main>
  );
}

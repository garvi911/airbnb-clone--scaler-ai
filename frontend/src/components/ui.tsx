"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Heart,
  Menu,
  Globe,
  Search,
  X,
  Star,
  ArrowUpRight,
  House,
  Luggage,
  CircleUserRound,
} from "lucide-react";
import { Listing, money } from "@/lib/api";
import { useSession } from "./session";

export function Header() {
  const { user, users, setUser, error } = useSession();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="header">
        <Link href="/" className="brand" aria-label="Airbnb home">
          <svg
            viewBox="0 0 32 36"
            width="33"
            height="37"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
          >
            <path d="M16 2C12 2 10 10 6 18S0 30 5 33c5 3 11-5 14-11 2-5-4-9-7-5-3 4 0 9 6 14 4 4 10 3 11-2 1-3-3-11-6-17S20 2 16 2Z" />
          </svg>
          <span>airbnb</span>
        </Link>
        <nav className="main-nav">
          <Link className={!path.startsWith("/host") ? "active" : ""} href="/">
            Homes
          </Link>
          <Link
            className={path.startsWith("/host") ? "active" : ""}
            href="/host"
          >
            Hosting
          </Link>
        </nav>
        <div className="header-actions">
          <Link className="host-link" href="/host">
            Airbnb your home
          </Link>
          <Globe size={19} />
          <button
            className="profile-button"
            aria-label="Open account menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={18} />
            <CircleUserRound size={29} />
          </button>
        </div>
      </header>
      {error && (
        <div className="service-error">
          Could not connect to the server. {error}{" "}
          <button onClick={() => location.reload()}>Retry</button>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Your account">
        <p className="muted">
          Assignment demo · choose a user to explore or host.
        </p>
        <label className="field">
          Demo user
          <select
            value={user}
            onChange={(e) => {
              setUser(Number(e.target.value));
              setOpen(false);
            }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <div className="account-links">
          {[
            [House, "Explore", "/"],
            [Heart, "Wishlists", "/wishlists"],
            [Luggage, "Trips", "/trips"],
            [ArrowUpRight, "Host dashboard", "/host"],
          ].map(([Icon, label, url]) => {
            const I = Icon as typeof House;
            return (
              <Link
                key={String(url)}
                href={String(url)}
                onClick={() => setOpen(false)}
              >
                <I size={20} />
                {String(label)}
              </Link>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

export function Footer() {
  return (
    <footer>
      <span>© {new Date().getFullYear()} Airbnb assignment demo</span>
      <div>
        <Link href="/">Explore</Link>
        <Link href="/wishlists">Wishlists</Link>
        <Link href="/trips">Trips</Link>
        <span>English (IN) · ₹ INR</span>
      </div>
    </footer>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    else if (!open && d?.open) d.close();
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2>{title}</h2>
        <span />
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

export function Photo({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  return (
    <img
      src={src}
      alt={alt}
      {...props}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/placeholder.svg";
      }}
    />
  );
}
export function Favorite({ id }: { id: number }) {
  const { favorites, toggle } = useSession();
  const [busy, setBusy] = useState(false);
  const saved = favorites.includes(id);
  return (
    <button
      className={"favorite " + (saved ? "saved" : "")}
      disabled={busy}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      onClick={async () => {
        setBusy(true);
        await toggle(id);
        setBusy(false);
      }}
    >
      <Heart
        size={23}
        fill={saved ? "#ff385c" : "rgba(0,0,0,.35)"}
        stroke="white"
        strokeWidth={2}
      />
    </button>
  );
}
export function ListingCard({
  listing,
  query = "",
}: {
  listing: Listing;
  query?: string;
}) {
  return (
    <article className="listing-card">
      <div className="card-photo">
        <Link href={`/listings/${listing.id}${query}`}>
          <Photo src={listing.images[0]} alt={listing.title} loading="lazy" />
        </Link>
        <Favorite id={listing.id} />
        <div className="photo-dots">
          <i />
          <i />
          <i />
        </div>
      </div>
      <Link className="card-info" href={`/listings/${listing.id}${query}`}>
        <div className="card-top">
          <strong>{listing.location}</strong>
          <span>
            <Star size={12} fill="currentColor" />
            {listing.rating?.toFixed(2) || "New"}
          </span>
        </div>
        <p>{listing.title}</p>
        <p>
          {listing.capacity} guests · {listing.property_type.toLowerCase()}
        </p>
        <div className="card-price">
          <strong>{money(listing.price)}</strong> <span>night</span>
        </div>
      </Link>
    </article>
  );
}
export function Empty({
  title,
  description,
  action = "Explore homes",
  href = "/",
}: {
  title: string;
  description: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="empty">
      <Search size={34} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button dark" href={href}>
        {action}
      </Link>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <div className="spinner" />
      Finding your next stay…
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-panel" role="alert">
      <h2>Something needs a little attention</h2>
      <p>{message}</p>
      {retry ? (
        <button className="button dark" onClick={retry}>
          Try again
        </button>
      ) : (
        <Link href="/" className="button dark">
          Back to homes
        </Link>
      )}
    </div>
  );
}

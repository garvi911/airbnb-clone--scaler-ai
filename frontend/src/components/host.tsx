"use client";
import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import {
  amenityOptions,
  api,
  Booking,
  categories,
  Listing,
  money,
  prettyDate,
} from "@/lib/api";
import { useSession } from "./session";
import { Empty, ErrorState, Loading, Modal, Photo } from "./ui";

export function Host() {
  const { user, users, toast } = useSession();
  const [listings, setListings] = useState<Listing[] | null>(null),
    [bookings, setBookings] = useState<Booking[]>([]),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [deleting, setDeleting] = useState<Listing | null>(null),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("listings");
  useEffect(() => {
    let active = true;
    setListings(null);
    setError("");
    Promise.all([
      api<Listing[]>("/me/listings", {}, user),
      api<Booking[]>("/me/host-bookings", {}, user),
    ])
      .then(([l, b]) => {
        if (active) {
          setListings(l);
          setBookings(b);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user, refresh]);
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/listings/${deleting.id}`, { method: "DELETE" }, user);
      setDeleting(null);
      setRefresh((r) => r + 1);
      toast("Listing deleted. Existing reservations are preserved.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="content collection">
      <div className="title-row">
        <div>
          <p className="eyebrow">HOST DASHBOARD</p>
          <h1>
            Welcome back, {users.find((u) => u.id === user)?.name || "host"}.
          </h1>
          <p className="muted">A little care makes a great stay.</p>
        </div>
        <Link className="button dark" href="/host/listings/new">
          <Plus size={18} />
          Create a listing
        </Link>
      </div>
      <div className="tabs">
        <button
          className={tab === "listings" ? "active" : ""}
          onClick={() => setTab("listings")}
        >
          Your listings {listings && `(${listings.length})`}
        </button>
        <button
          className={tab === "bookings" ? "active" : ""}
          onClick={() => setTab("bookings")}
        >
          Reservations ({bookings.length})
        </button>
      </div>
      {error ? (
        <ErrorState message={error} retry={() => setRefresh((r) => r + 1)} />
      ) : !listings ? (
        <Loading />
      ) : tab === "listings" ? (
        listings.length ? (
          <div className="host-listings">
            {listings.map((l) => (
              <article className="host-listing" key={l.id}>
                <Link href={`/listings/${l.id}`}>
                  <Photo src={l.images[0]} alt={l.title} />
                </Link>
                <div>
                  <span className="status-badge">Listed</span>
                  <Link href={`/listings/${l.id}`}>
                    <h3>{l.title}</h3>
                  </Link>
                  <p className="muted">
                    {l.location} · {l.capacity} guests
                  </p>
                  <strong>{money(l.price)} / night</strong>
                </div>
                <div className="host-buttons">
                  <Link
                    className="button outline"
                    href={`/host/listings/${l.id}/edit`}
                  >
                    <Pencil size={16} />
                    Edit
                  </Link>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${l.title}`}
                    onClick={() => setDeleting(l)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Your hosting journey starts here"
            description="Create your first listing and welcome guests to a place you love."
            action="Create a listing"
            href="/host/listings/new"
          />
        )
      ) : bookings.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Guest</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Booking total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.listing_title}</strong>
                    <small>AB{String(b.id).padStart(5, "0")}</small>
                  </td>
                  <td>{b.guest_name}</td>
                  <td>
                    {prettyDate(b.check_in)}
                    <br />
                    {prettyDate(b.check_out)}
                  </td>
                  <td>{b.guests}</td>
                  <td>{money(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No reservations yet"
          description="Your guests' reservations will appear here."
          action="View your listings"
          href="/host"
        />
      )}
      <Modal
        open={!!deleting}
        title="Delete listing?"
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
      >
        <p>
          <strong>{deleting?.title}</strong> will no longer appear in search.
          Existing reservations will stay in your booking history.
        </p>
        <div className="modal-actions">
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Keep listing
          </button>
          <button className="button dark" disabled={busy} onClick={remove}>
            {busy ? "Deleting…" : "Delete listing"}
          </button>
        </div>
      </Modal>
    </main>
  );
}

type FormState = {
  title: string;
  description: string;
  location: string;
  property_type: string;
  category: string;
  price: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  images: string;
  amenities: string[];
};
const initial: FormState = {
  title: "",
  description: "",
  location: "",
  property_type: "House",
  category: "Design",
  price: "",
  capacity: 2,
  bedrooms: 1,
  bathrooms: 1,
  images: "",
  amenities: ["Wifi", "Kitchen"],
};
export function ListingForm({ id }: { id?: number }) {
  const { user, toast } = useSession(),
    router = useRouter();
  const [form, setForm] = useState<FormState>(initial),
    [loading, setLoading] = useState(!!id),
    [error, setError] = useState(""),
    [forbidden, setForbidden] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setError("");
    setForbidden(false);
    if (id) {
      setLoading(true);
      api<Listing>(`/listings/${id}`)
        .then((l) => {
          if (!active) return;
          if (l.host_id !== user) {
            setForbidden(true);
            setError(
              "Only the owner can edit this listing. Select the correct demo user.",
            );
            return;
          }
          setForm({
            ...l,
            price: String(l.price / 100),
            images: l.images.join("\n"),
          });
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setForbidden(true);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setForm(initial);
    }
    return () => {
      active = false;
    };
  }, [id, user]);
  const change = (key: keyof FormState, value: string | number | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const images = form.images
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!images.length) {
      setError("Add at least one photo URL.");
      return;
    }
    if (
      images.some((url) => {
        if (/^\/stays\/(?:[1-9]|1[0-2])\.jpg$/.test(url)) return false;
        try {
          return !["https:", "http:"].includes(new URL(url).protocol);
        } catch {
          return true;
        }
      })
    ) {
      setError("Each photo needs a valid http or https URL.");
      return;
    }
    setBusy(true);
    try {
      await api(
        id ? `/listings/${id}` : "/listings",
        {
          method: id ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            price: Math.round(Number(form.price) * 100),
            images,
          }),
        },
        user,
      );
      toast(id ? "Listing updated" : "Your listing is live");
      router.push("/host");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <Loading />;
  if (forbidden)
    return (
      <main className="content">
        <ErrorState message={error} />
      </main>
    );
  return (
    <main className="content form-page">
      <Link className="back-link" href="/host">
        <ArrowLeft size={18} />
        Your listings
      </Link>
      <p className="eyebrow">HOST YOUR SPACE</p>
      <h1>
        {id
          ? "Make your listing shine"
          : "Let’s get your home ready for guests"}
      </h1>
      <p className="muted">
        A few thoughtful details help guests find their perfect stay.
      </p>
      <form onSubmit={submit}>
        <section>
          <h2>The essentials</h2>
          <label className="field">
            Listing title
            <input
              required
              minLength={5}
              maxLength={100}
              value={form.title}
              placeholder="A peaceful cottage in the hills"
              onChange={(e) => change("title", e.target.value)}
            />
          </label>
          <label className="field">
            Description
            <textarea
              required
              minLength={30}
              maxLength={5000}
              rows={5}
              value={form.description}
              placeholder="Tell guests what makes your space special…"
              onChange={(e) => change("description", e.target.value)}
            />
          </label>
          <label className="field">
            Location
            <input
              required
              minLength={3}
              value={form.location}
              placeholder="City, State"
              onChange={(e) => change("location", e.target.value)}
            />
          </label>
          <div className="form-row">
            <label className="field">
              Property type
              <select
                value={form.property_type}
                onChange={(e) => change("property_type", e.target.value)}
              >
                {["House", "Apartment", "Villa", "Cabin"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Category
              <select
                value={form.category}
                onChange={(e) => change("category", e.target.value)}
              >
                {categories.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section>
          <h2>Room for everyone</h2>
          <div className="form-row">
            {(["capacity", "bedrooms", "bathrooms"] as const).map((key) => (
              <label className="field" key={key}>
                {key === "capacity"
                  ? "Maximum guests"
                  : key[0].toUpperCase() + key.slice(1)}
                <input
                  required
                  type="number"
                  min={1}
                  max={key === "capacity" ? 30 : 20}
                  value={form[key]}
                  onChange={(e) => change(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <label className="field">
            Nightly price (₹ INR)
            <input
              required
              type="number"
              min={100}
              max={1000000}
              step="0.01"
              value={form.price}
              onChange={(e) => change("price", e.target.value)}
              placeholder="4500"
            />
          </label>
        </section>
        <section>
          <h2>What your place offers</h2>
          <div className="checkbox-grid">
            {amenityOptions.map((a) => (
              <label key={a}>
                <input
                  type="checkbox"
                  checked={form.amenities.includes(a)}
                  onChange={(e) =>
                    change(
                      "amenities",
                      e.target.checked
                        ? [...form.amenities, a]
                        : form.amenities.filter((x) => x !== a),
                    )
                  }
                />
                {a}
              </label>
            ))}
          </div>
        </section>
        <section>
          <h2>Show off your space</h2>
          <p className="muted">
            Add 1–10 photo URLs, one per line. The first photo is your cover.
          </p>
          <label className="field">
            Photo URLs
            <textarea
              required
              rows={4}
              value={form.images}
              placeholder="https://images.example.com/your-home.jpg"
              onChange={(e) => change("images", e.target.value)}
            />
          </label>
          <div className="photo-previews">
            {form.images
              .split("\n")
              .filter((s) => /^(https?:\/\/|\/stays\/)/.test(s.trim()))
              .slice(0, 10)
              .map((src, i) => (
                <Photo key={i} src={src.trim()} alt={`Preview ${i + 1}`} />
              ))}
          </div>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <Link className="text-button" href="/host">
            Cancel
          </Link>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : id ? "Save changes" : "Publish listing"}
          </button>
        </div>
      </form>
    </main>
  );
}

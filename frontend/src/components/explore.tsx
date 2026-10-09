"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Waves,
  Mountain,
  TentTree,
  Umbrella,
  Trees,
  Gem,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  api,
  Listing,
  categories,
  amenityOptions,
  prettyDate,
} from "@/lib/api";
import { Empty, ErrorState, ListingCard, Loading, Modal } from "./ui";
import { Calendar, GuestCounter } from "./calendar";

export default function Explore() {
  const params = useSearchParams(),
    router = useRouter(),
    query = params.toString();
  const [data, setData] = useState<{
    items: Listing[];
    total: number;
    page: number;
    page_size: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [location, setLocation] = useState(params.get("location") || "");
  const [start, setStart] = useState(params.get("check_in") || "");
  const [end, setEnd] = useState(params.get("check_out") || "");
  const [guests, setGuests] = useState(Number(params.get("guests") || 1));
  const [dialog, setDialog] = useState("");
  const [draft, setDraft] = useState({
    min: "",
    max: "",
    type: "",
    amenities: [] as string[],
  });
  const [filterError, setFilterError] = useState("");
  useEffect(() => {
    setLocation(params.get("location") || "");
    setStart(params.get("check_in") || "");
    setEnd(params.get("check_out") || "");
    setGuests(Number(params.get("guests") || 1));
  }, [query, params]);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    api<typeof data>(`/listings?${query}`)
      .then((v) => {
        if (alive) setData(v);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [query, retry]);
  const update = (values: Record<string, string>) => {
    const q = new URLSearchParams(query);
    q.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (value) q.set(key, value);
      else q.delete(key);
    }
    router.push("/?" + q);
  };
  const search = () => {
    if ((start && !end) || (!start && end)) {
      setDialog("dates");
      return;
    }
    update({
      location,
      check_in: start,
      check_out: end,
      guests: String(guests),
    });
  };
  const openFilters = () => {
    setDraft({
      min: params.has("min_price")
        ? String(Number(params.get("min_price")) / 100)
        : "",
      max: params.has("max_price")
        ? String(Number(params.get("max_price")) / 100)
        : "",
      type: params.get("property_type") || "",
      amenities: (params.get("amenities") || "").split(",").filter(Boolean),
    });
    setFilterError("");
    setDialog("filters");
  };
  const activeCount = [
    "min_price",
    "max_price",
    "property_type",
    "amenities",
  ].filter((k) => params.has(k)).length;
  const icons = [Waves, Mountain, TentTree, Umbrella, Trees, Gem];
  const tripQuery = new URLSearchParams();
  for (const key of ["check_in", "check_out", "guests"]) {
    if (params.get(key)) tripQuery.set(key, params.get(key)!);
  }
  return (
    <>
      <section className="search-section">
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <label className="destination">
            <strong>Where</strong>
            <input
              aria-label="Search destinations"
              placeholder="Search destinations"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="search-part"
            onClick={() => setDialog("dates")}
          >
            <strong>Check in</strong>
            <span>
              {start ? prettyDate(start).replace(/ \d{4}$/, "") : "Add dates"}
            </span>
          </button>
          <button
            type="button"
            className="search-part"
            onClick={() => setDialog("dates")}
          >
            <strong>Check out</strong>
            <span>
              {end ? prettyDate(end).replace(/ \d{4}$/, "") : "Add dates"}
            </span>
          </button>
          <button
            type="button"
            className="search-part who"
            onClick={() => setDialog("guests")}
          >
            <strong>Who</strong>
            <span>{guests > 1 ? `${guests} guests` : "Add guests"}</span>
          </button>
          <button
            type="submit"
            className="search-submit"
            aria-label="Search homes"
          >
            <Search size={22} />
          </button>
        </form>
      </section>
      <main className="explore">
        <div className="category-row">
          <div className="categories">
            <button
              className={!params.get("category") ? "selected" : ""}
              onClick={() => update({ category: "" })}
            >
              <Search size={25} />
              <span>All homes</span>
            </button>
            {categories.map((name, i) => {
              const Icon = icons[i];
              return (
                <button
                  key={name}
                  className={params.get("category") === name ? "selected" : ""}
                  onClick={() => update({ category: name })}
                >
                  <Icon size={26} strokeWidth={1.6} />
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
          <button className="filter-button" onClick={openFilters}>
            <SlidersHorizontal size={17} />
            Filters{activeCount > 0 && <b>{activeCount}</b>}
          </button>
        </div>
        <div className="results-heading">
          <div>
            <h1>
              {params.get("location")
                ? `Stays in ${params.get("location")}`
                : "Find your kind of getaway"}
            </h1>
            <p>
              {data ? `${data.total} homes` : "Beautiful homes"} · A place for
              every kind of escape
            </p>
          </div>
          {query && (
            <button className="text-button" onClick={() => router.push("/")}>
              Clear search
            </button>
          )}
        </div>
        {error ? (
          <ErrorState message={error} retry={() => setRetry((r) => r + 1)} />
        ) : !data ? (
          <Loading />
        ) : data.items.length ? (
          <>
            <div className="listing-grid">
              {data.items.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  query={tripQuery.size ? "?" + tripQuery : ""}
                />
              ))}
            </div>
            {data.total > data.page_size && (
              <div className="pagination">
                <button
                  className="circle-button"
                  aria-label="Previous page"
                  disabled={data.page === 1}
                  onClick={() => update({ page: String(data.page - 1) })}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from(
                  { length: Math.ceil(data.total / data.page_size) },
                  (_, i) => (
                    <button
                      key={i}
                      className={
                        "page-number " + (data.page === i + 1 ? "active" : "")
                      }
                      onClick={() => update({ page: String(i + 1) })}
                    >
                      {i + 1}
                    </button>
                  ),
                )}
                <button
                  className="circle-button"
                  aria-label="Next page"
                  disabled={data.page * data.page_size >= data.total}
                  onClick={() => update({ page: String(data.page + 1) })}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        ) : (
          <Empty
            title="No homes match just yet"
            description="Try another destination, a wider date range, or fewer filters."
          />
        )}
      </main>
      <Modal
        open={dialog === "dates"}
        title="When's your trip?"
        onClose={() => setDialog("")}
      >
        <Calendar
          start={start}
          end={end}
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
        <button
          className="button dark full"
          disabled={!!start && !end}
          onClick={() => setDialog("")}
        >
          Save dates
        </button>
      </Modal>
      <Modal
        open={dialog === "guests"}
        title="Who's coming?"
        onClose={() => setDialog("")}
      >
        <GuestCounter value={guests} onChange={setGuests} />
        <button className="button dark full" onClick={() => setDialog("")}>
          Done
        </button>
      </Modal>
      <Modal
        open={dialog === "filters"}
        title="Filters"
        onClose={() => setDialog("")}
      >
        <h3>Price range</h3>
        <p className="muted">Nightly prices before fees, in INR</p>
        <div className="form-row">
          <label className="field">
            Minimum
            <input
              type="number"
              min="0"
              placeholder="₹ 0"
              value={draft.min}
              onChange={(e) => setDraft({ ...draft, min: e.target.value })}
            />
          </label>
          <label className="field">
            Maximum
            <input
              type="number"
              min="0"
              placeholder="Any price"
              value={draft.max}
              onChange={(e) => setDraft({ ...draft, max: e.target.value })}
            />
          </label>
        </div>
        <h3>Property type</h3>
        <div className="chips">
          {["", "House", "Apartment", "Villa", "Cabin"].map((t) => (
            <button
              key={t}
              className={draft.type === t ? "active" : ""}
              onClick={() => setDraft({ ...draft, type: t })}
            >
              {t || "Any type"}
            </button>
          ))}
        </div>
        <h3>Amenities</h3>
        <div className="checkbox-grid">
          {amenityOptions.map((a) => (
            <label key={a}>
              <input
                type="checkbox"
                checked={draft.amenities.includes(a)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    amenities: e.target.checked
                      ? [...draft.amenities, a]
                      : draft.amenities.filter((x) => x !== a),
                  })
                }
              />
              {a}
            </label>
          ))}
        </div>
        {filterError && <p className="form-error">{filterError}</p>}
        <div className="modal-actions">
          <button
            className="text-button"
            onClick={() =>
              setDraft({ min: "", max: "", type: "", amenities: [] })
            }
          >
            Clear all
          </button>
          <button
            className="button dark"
            onClick={() => {
              if (
                (draft.min && Number(draft.min) < 0) ||
                (draft.max && Number(draft.max) < 0) ||
                (draft.min &&
                  draft.max &&
                  Number(draft.min) > Number(draft.max))
              ) {
                setFilterError("Enter a valid minimum and maximum price.");
                return;
              }
              update({
                min_price: draft.min
                  ? String(Math.round(Number(draft.min) * 100))
                  : "",
                max_price: draft.max
                  ? String(Math.round(Number(draft.max) * 100))
                  : "",
                property_type: draft.type,
                amenities: draft.amenities.join(","),
              });
              setDialog("");
            }}
          >
            Show homes
          </button>
        </div>
      </Modal>
    </>
  );
}

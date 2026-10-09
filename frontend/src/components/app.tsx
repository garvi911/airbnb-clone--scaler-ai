"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Listing } from "@/lib/api";
import { useSession } from "./session";
import { Empty, ErrorState, ListingCard, Loading } from "./ui";
import Explore from "./explore";
import Detail from "./detail";
import { Checkout, Confirmation, Trips } from "./bookings";
import { Host, ListingForm } from "./host";

function Wishlists() {
  const { user, favorites } = useSession();
  const [data, setData] = useState<Listing[] | null>(null),
    [error, setError] = useState("");
  const ids = favorites.join(",");
  useEffect(() => {
    let active = true;
    setError("");
    api<Listing[]>("/me/favorites", {}, user)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user, ids]);
  return (
    <main className="content collection">
      <h1>Wishlists</h1>
      <p className="muted">A little inspiration for your next escape.</p>
      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <Loading />
      ) : data.length ? (
        <div className="listing-grid wishlist-grid">
          {data.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <Empty
          title="Your next adventure starts with a heart"
          description="Tap the heart on a home you love. You'll find your saved places here."
        />
      )}
    </main>
  );
}

export default function App() {
  const path = usePathname();
  let match;
  if (path === "/") return <Explore />;
  if ((match = path.match(/^\/listings\/(\d+)$/)))
    return <Detail key={path} id={Number(match[1])} />;
  if (path === "/bookings/checkout") return <Checkout />;
  if ((match = path.match(/^\/bookings\/(\d+)\/confirmation$/)))
    return <Confirmation id={Number(match[1])} />;
  if (path === "/trips") return <Trips />;
  if (path === "/wishlists") return <Wishlists />;
  if (path === "/host") return <Host />;
  if (path === "/host/listings/new") return <ListingForm />;
  if ((match = path.match(/^\/host\/listings\/(\d+)\/edit$/)))
    return <ListingForm key={path} id={Number(match[1])} />;
  return (
    <main className="content">
      <Empty
        title="This page wandered off"
        description="Let's get you back to finding a great stay."
      />
    </main>
  );
}

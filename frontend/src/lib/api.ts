export type User = { id: number; name: string; initials: string; bio: string };
export type Review = {
  id: number;
  name: string;
  initials: string;
  rating: number;
  comment: string;
  created_at: string;
};
export type Listing = {
  id: number;
  host_id: number;
  title: string;
  description: string;
  location: string;
  property_type: string;
  category: string;
  price: number;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  images: string[];
  amenities: string[];
  rating: number | null;
  reviews: Review[];
  host: User;
};
export type Quote = {
  nights: number;
  nightly_price: number;
  subtotal: number;
  fee: number;
  total: number;
};
export type Booking = Quote & {
  id: number;
  listing_id: number;
  listing_title: string;
  location: string;
  image_url: string;
  check_in: string;
  check_out: string;
  guests: number;
  guest_name?: string;
};
export type Range = { check_in: string; check_out: string };
export const categories = [
  "Pools",
  "Amazing views",
  "Cabins",
  "Beachfront",
  "Countryside",
  "Design",
];
export const amenityOptions = [
  "Wifi",
  "Kitchen",
  "Pool",
  "Free parking",
  "Air conditioning",
  "Washing machine",
  "Workspace",
  "Garden",
];
export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 100 ? 2 : 0,
  }).format(value / 100);
export function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const today = () => localDate(new Date());
export const prettyDate = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export async function api<T>(
  path: string,
  options: RequestInit = {},
  user?: number,
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { "X-User-Id": String(user) } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = Array.isArray(data.detail)
      ? data.detail.map((e: { msg: string }) => e.msg).join(" ")
      : data.detail;
    throw new Error(message || "Something went wrong. Please try again.");
  }
  return response.json();
}

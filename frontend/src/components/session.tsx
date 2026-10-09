"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, Listing, User } from "@/lib/api";
type Session = {
  user: number;
  users: User[];
  setUser: (n: number) => void;
  favorites: number[];
  toggle: (n: number) => Promise<void>;
  toast: (s: string) => void;
  error: string;
};
const Context = createContext<Session>(null!);
export const useSession = () => useContext(Context);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, updateUser] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [message, toast] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const saved = Number(localStorage.getItem("demo-user"));
    if (saved) updateUser(saved);
    api<User[]>("/users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    let active = true;
    setFavorites([]);
    api<Listing[]>("/me/favorites", {}, user)
      .then((v) => {
        if (active) setFavorites(v.map((l) => l.id));
      })
      .catch((e) => {
        if (active) toast(e.message);
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => toast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [message]);
  const setUser = (id: number) => {
    localStorage.setItem("demo-user", String(id));
    updateUser(id);
    toast("Demo user changed");
  };
  const toggle = async (id: number) => {
    const saved = favorites.includes(id);
    try {
      await api(
        `/me/favorites/${id}`,
        { method: saved ? "DELETE" : "PUT" },
        user,
      );
      setFavorites((current) =>
        saved ? current.filter((x) => x !== id) : [...current, id],
      );
      toast(saved ? "Removed from wishlist" : "Saved to wishlist");
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <Context.Provider
      value={{ user, users, setUser, favorites, toggle, toast, error }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}

import { useSyncExternalStore } from "react";

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  service: string;
  date: string;
  time: string;
  address: string;
  note?: string;
  price: number;
  status: "pendiente" | "en camino" | "completado";
  createdAt: number;
}

const KEY = "manitos.bookings.v1";
let bookings: Booking[] = load();
const listeners = new Set<() => void>();

function load(): Booking[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(bookings));
  listeners.forEach((l) => l());
}

export function addBooking(b: Omit<Booking, "id" | "createdAt" | "status">) {
  const booking: Booking = {
    ...b,
    id: Math.random().toString(36).slice(2, 10),
    createdAt: Date.now(),
    status: "pendiente",
  };
  bookings = [booking, ...bookings];
  persist();
  return booking;
}

export function useBookings() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => bookings,
    () => [] as Booking[],
  );
}

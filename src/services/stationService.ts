/**
 * Single data-access layer for ChargeHub.
 * Every screen reads/writes charging data through these functions, so a
 * different source (Open Charge Map, operator feeds, etc.) can be plugged in
 * here by mapping its response into the shared types in `@/lib/types`.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Connector, Operator, Station, Vehicle } from "@/lib/types";

const STATION_SELECT =
  "id,name,address,city,lat,lng,opening_hours,amenities,operator:operators(id,name,logo_url),connectors(id,type,power_kw,price_per_kwh,status)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStation(row: any): Station {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    lat: Number(row.lat),
    lng: Number(row.lng),
    opening_hours: row.opening_hours,
    amenities: row.amenities ?? [],
    operator: row.operator as Operator,
    connectors: ((row.connectors ?? []) as Connector[]).map((c) => ({
      ...c,
      power_kw: Number(c.power_kw),
      price_per_kwh: Number(c.price_per_kwh),
    })),
  };
}

export async function getStations(): Promise<Station[]> {
  const { data, error } = await supabase.from("stations").select(STATION_SELECT).order("name");
  if (error) throw error;
  return (data ?? []).map(mapStation);
}

export async function getStation(id: string): Promise<Station | null> {
  const { data, error } = await supabase
    .from("stations")
    .select(STATION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStation(data) : null;
}

export async function getOperators(): Promise<Operator[]> {
  const { data, error } = await supabase.from("operators").select("id,name,logo_url").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id,make,model,connector_types,max_charge_kw")
    .order("make")
    .order("model");
  if (error) throw error;
  return (data ?? []).map((v) => ({ ...v, max_charge_kw: Number(v.max_charge_kw) }));
}

export async function reportIssue(stationId: string, description: string, userId: string | null) {
  const { error } = await supabase
    .from("issue_reports")
    .insert({ station_id: stationId, description, user_id: userId });
  if (error) throw error;
}

// ---- User-scoped (RLS restricts to the signed-in user) ----

export async function getFavouriteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("favourites").select("station_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((f) => f.station_id);
}

export async function getFavouriteStations(userId: string): Promise<Station[]> {
  const ids = await getFavouriteIds(userId);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("stations").select(STATION_SELECT).in("id", ids);
  if (error) throw error;
  return (data ?? []).map(mapStation);
}

export async function addFavourite(userId: string, stationId: string) {
  const { error } = await supabase.from("favourites").insert({ user_id: userId, station_id: stationId });
  if (error) throw error;
}

export async function removeFavourite(userId: string, stationId: string) {
  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", userId)
    .eq("station_id", stationId);
  if (error) throw error;
}

export interface Profile {
  id: string;
  full_name: string | null;
  vehicle_id: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,vehicle_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(p: Profile) {
  const { error } = await supabase.from("profiles").upsert(p);
  if (error) throw error;
}

// ---- Geocoding (OpenStreetMap Nominatim, no key) ----
export async function geocode(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Search failed");
  const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = json[0];
  if (!first) return null;
  return { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name };
}

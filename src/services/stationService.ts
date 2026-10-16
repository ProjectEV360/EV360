/**
 * Single data-access layer for EV360 / ChargeHub.
 * Every screen reads/writes charging data through these functions.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Connector, Operator, Profile, Station, Vehicle } from "@/lib/types";
import { SEED_OPERATORS, SEED_STATIONS, SEED_VEHICLES } from "@/lib/seed-data";

export type { Profile };

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
  try {
    const { data, error } = await supabase.from("stations").select(STATION_SELECT).order("name");
    if (!error && data && data.length > 0) {
      return data.map(mapStation);
    }
  } catch (err) {
    console.warn("Could not query stations table, using fallback data:", err);
  }
  return SEED_STATIONS;
}

export async function getStation(id: string): Promise<Station | null> {
  try {
    const { data, error } = await supabase
      .from("stations")
      .select(STATION_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      return mapStation(data);
    }
  } catch (err) {
    console.warn("Could not query station by ID, checking fallback data:", err);
  }
  const fallback = SEED_STATIONS.find((s) => s.id === id);
  return fallback ?? null;
}

export async function getOperators(): Promise<Operator[]> {
  try {
    const { data, error } = await supabase
      .from("operators")
      .select("id,name,logo_url")
      .order("name");
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn("Could not query operators table, using fallback data:", err);
  }
  return SEED_OPERATORS;
}

export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id,make,model,connector_types,max_charge_kw")
      .order("make")
      .order("model");
    if (!error && data && data.length > 0) {
      return data.map((v) => ({ ...v, max_charge_kw: Number(v.max_charge_kw) }));
    }
  } catch (err) {
    console.warn("Could not query vehicles table, using fallback data:", err);
  }
  return SEED_VEHICLES;
}

export async function reportIssue(stationId: string, description: string, userId: string | null) {
  try {
    const { error } = await supabase
      .from("issue_reports")
      .insert({ station_id: stationId, description, user_id: userId });
    if (error) console.warn("Issue report error:", error);
  } catch (err) {
    console.warn("Could not submit issue report:", err);
  }
}

// ---- User-scoped (Favourites) ----

export async function getFavouriteIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("favourites")
      .select("station_id")
      .eq("user_id", userId);
    if (!error && data) {
      const ids = data.map((f) => f.station_id);
      try {
        localStorage.setItem(`ev360_favs_${userId}`, JSON.stringify(ids));
      } catch {
        // ignore
      }
      return ids;
    }
  } catch (err) {
    console.warn("Could not query favourites table:", err);
  }

  try {
    const cached = localStorage.getItem(`ev360_favs_${userId}`);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }
  return [];
}

export async function getFavouriteStations(userId: string): Promise<Station[]> {
  const ids = await getFavouriteIds(userId);
  if (!ids.length) return [];

  try {
    const { data, error } = await supabase.from("stations").select(STATION_SELECT).in("id", ids);
    if (!error && data && data.length > 0) {
      return data.map(mapStation);
    }
  } catch (err) {
    console.warn("Could not query favourite stations from DB:", err);
  }

  const allStations = await getStations();
  return allStations.filter((s) => ids.includes(s.id));
}

export async function addFavourite(userId: string, stationId: string) {
  try {
    const cached = localStorage.getItem(`ev360_favs_${userId}`);
    const ids: string[] = cached ? JSON.parse(cached) : [];
    if (!ids.includes(stationId)) {
      ids.push(stationId);
      localStorage.setItem(`ev360_favs_${userId}`, JSON.stringify(ids));
    }
  } catch {
    // ignore
  }

  try {
    await supabase.from("favourites").insert({ user_id: userId, station_id: stationId });
  } catch (err) {
    console.warn("Could not insert into favourites table:", err);
  }
}

export async function removeFavourite(userId: string, stationId: string) {
  try {
    const cached = localStorage.getItem(`ev360_favs_${userId}`);
    if (cached) {
      const ids: string[] = JSON.parse(cached);
      const filtered = ids.filter((id) => id !== stationId);
      localStorage.setItem(`ev360_favs_${userId}`, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }

  try {
    await supabase.from("favourites").delete().eq("user_id", userId).eq("station_id", stationId);
  } catch (err) {
    console.warn("Could not delete from favourites table:", err);
  }
}

// ---- Profile Management ----

export async function getProfile(userId: string): Promise<Profile | null> {
  let profileData: Partial<Profile> = { id: userId };

  // 1. Try reading from auth.users (user_metadata)
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && authData.user.id === userId) {
      const meta = (authData.user.user_metadata || {}) as Record<string, string | null | undefined>;
      profileData = {
        id: userId,
        email: authData.user.email ?? null,
        full_name: meta["full_name"] ?? meta["name"] ?? null,
        phone: meta["phone"] ?? authData.user.phone ?? null,
        city: meta["city"] ?? null,
        avatar_url: meta["avatar_url"] ?? meta["picture"] ?? null,
        vehicle_id: meta["vehicle_id"] ?? null,
        created_at: authData.user.created_at ?? null,
      };
    }
  } catch (err) {
    console.warn("Could not get auth user for profile:", err);
  }

  // 2. Try reading from public.profiles table
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      profileData = {
        ...profileData,
        ...data,
        id: userId,
      };
    }
  } catch (err) {
    console.warn("Could not fetch profiles table:", err);
  }

  // 3. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(`ev360_profile_${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      profileData = { ...parsed, ...profileData };
    }
  } catch {
    // ignore
  }

  return {
    id: userId,
    full_name: profileData.full_name ?? null,
    email: profileData.email ?? null,
    phone: profileData.phone ?? null,
    city: profileData.city ?? null,
    avatar_url: profileData.avatar_url ?? null,
    vehicle_id: profileData.vehicle_id ?? null,
    created_at: profileData.created_at ?? new Date().toISOString(),
  };
}

export async function saveProfile(p: Profile) {
  // 1. Update Supabase Auth user metadata
  try {
    await supabase.auth.updateUser({
      data: {
        full_name: p.full_name,
        phone: p.phone,
        city: p.city,
        avatar_url: p.avatar_url,
        vehicle_id: p.vehicle_id,
      },
    });
  } catch (err) {
    console.warn("Could not update auth user metadata:", err);
  }

  // 2. Try saving to public.profiles table
  try {
    await supabase.from("profiles").upsert({
      id: p.id,
      full_name: p.full_name,
      vehicle_id: p.vehicle_id,
    });
  } catch (err) {
    console.warn("Could not upsert into profiles table:", err);
  }

  // 3. Cache to localStorage
  try {
    localStorage.setItem(`ev360_profile_${p.id}`, JSON.stringify(p));
  } catch {
    // ignore
  }
}

// ---- Geocoding (OpenStreetMap Nominatim, no key) ----
export async function geocode(
  query: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Search failed");
  const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = json[0];
  if (!first) return null;
  return { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name };
}

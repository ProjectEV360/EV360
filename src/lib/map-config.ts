/**
 * Helper to retrieve stored Google Maps API key
 */
export function getStoredGoogleKey(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("chargehub_gmaps_key");
    if (saved && saved.trim()) return saved.trim();
  }
  const envKey = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"];
  return envKey ? envKey.trim() : "";
}

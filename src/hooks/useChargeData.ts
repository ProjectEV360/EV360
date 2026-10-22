import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addFavourite,
  getFavouriteIds,
  getFavouriteStations,
  getOperators,
  getProfile,
  getStation,
  getStations,
  getVehicles,
  removeFavourite,
} from "@/services/stationService";

import {
  getHomeChargers,
  getHomeChargerById,
  getMerchantProfile,
  calculateHostEarnings,
  getHostBookings,
  getUserBookings,
  getHostPayouts,
  getAllPayouts,
  getAllMerchantProfiles,
  getAllBookings,
  getBlockedSlots,
} from "@/services/marketplaceService";

export const useStations = (userId?: string) =>
  useQuery({
    queryKey: ["stations", userId],
    queryFn: () => getStations(userId),
    refetchInterval: 15000, // Dynamic background refresh every 15s
    refetchOnWindowFocus: true,
  });
export const useStation = (id: string, userId?: string) =>
  useQuery({ queryKey: ["station", id, userId], queryFn: () => getStation(id, userId) });
export const useOperators = () =>
  useQuery({ queryKey: ["operators"], queryFn: getOperators, staleTime: Infinity });
export const useVehicles = () =>
  useQuery({ queryKey: ["vehicles"], queryFn: getVehicles, staleTime: Infinity });

// ─── Marketplace Hooks ────────────────────────────────────────────────────────
export const useHomeChargers = (userId?: string) =>
  useQuery({
    queryKey: ["home-chargers", userId],
    queryFn: () => getHomeChargers(userId),
  });

export const useHomeCharger = (id: string, userId?: string) =>
  useQuery({
    queryKey: ["home-charger", id, userId],
    queryFn: () => getHomeChargerById(id, userId),
    enabled: !!id,
  });

export const useMerchantProfile = (userId?: string) =>
  useQuery({
    queryKey: ["merchant-profile", userId],
    queryFn: () => getMerchantProfile(userId!),
    enabled: !!userId,
  });

export const useHostEarnings = (hostId?: string) =>
  useQuery({
    queryKey: ["host-earnings", hostId],
    queryFn: () => calculateHostEarnings(hostId!),
    enabled: !!hostId,
  });

export const useHostBookings = (hostId?: string) =>
  useQuery({
    queryKey: ["host-bookings", hostId],
    queryFn: () => getHostBookings(hostId!),
    enabled: !!hostId,
  });

export const useUserBookings = (userId?: string) =>
  useQuery({
    queryKey: ["user-bookings", userId],
    queryFn: () => getUserBookings(userId!),
    enabled: !!userId,
  });

export const useHostPayouts = (hostId?: string) =>
  useQuery({
    queryKey: ["host-payouts", hostId],
    queryFn: () => getHostPayouts(hostId!),
    enabled: !!hostId,
  });

export const useBlockedSlots = (chargerId: string) =>
  useQuery({
    queryKey: ["blocked-slots", chargerId],
    queryFn: () => getBlockedSlots(chargerId),
    enabled: !!chargerId,
  });

export const useAllPayouts = () =>
  useQuery({
    queryKey: ["all-payouts"],
    queryFn: getAllPayouts,
  });

export const useAllMerchantProfiles = () =>
  useQuery({
    queryKey: ["all-merchant-profiles"],
    queryFn: getAllMerchantProfiles,
  });

export const useAllBookings = () =>
  useQuery({
    queryKey: ["all-bookings"],
    queryFn: getAllBookings,
  });

export const useProfile = (userId?: string) =>
  useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });

export const useFavouriteIds = (userId?: string) =>
  useQuery({
    queryKey: ["favourites", userId],
    queryFn: () => getFavouriteIds(userId!),
    enabled: !!userId,
  });

export const useFavouriteStations = (userId?: string) =>
  useQuery({
    queryKey: ["favourite-stations", userId],
    queryFn: () => getFavouriteStations(userId!),
    enabled: !!userId,
  });

export function useToggleFavourite(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stationId, isFav }: { stationId: string; isFav: boolean }) => {
      if (!userId) throw new Error("Not signed in");
      if (isFav) await removeFavourite(userId, stationId);
      else await addFavourite(userId, stationId);
      return !isFav;
    },
    onSuccess: (nowFav) => {
      toast.success(nowFav ? "Saved to favourites" : "Removed from favourites");
      qc.invalidateQueries({ queryKey: ["favourites", userId] });
      qc.invalidateQueries({ queryKey: ["favourite-stations", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

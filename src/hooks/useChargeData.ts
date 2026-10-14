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

export const useStations = () =>
  useQuery({
    queryKey: ["stations"],
    queryFn: getStations,
    refetchInterval: 15000, // Dynamic background refresh every 15s
    refetchOnWindowFocus: true,
  });
export const useStation = (id: string) =>
  useQuery({ queryKey: ["station", id], queryFn: () => getStation(id) });
export const useOperators = () =>
  useQuery({ queryKey: ["operators"], queryFn: getOperators, staleTime: Infinity });
export const useVehicles = () =>
  useQuery({ queryKey: ["vehicles"], queryFn: getVehicles, staleTime: Infinity });

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

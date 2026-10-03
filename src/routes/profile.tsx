import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { User, Mail, Car, Heart, LogOut, Loader2, Save, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/Navbar";
import { StationCard } from "@/components/StationCard";
import {
  useProfile,
  useVehicles,
  useFavouriteStations,
  useFavouriteIds,
  useToggleFavourite,
} from "@/hooks/useChargeData";
import { useAuth } from "@/hooks/useAuth";
import { saveProfile } from "@/services/stationService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile — ChargeHub" },
      {
        name: "description",
        content: "Manage your ChargeHub profile, vehicle, and saved stations.",
      },
    ],
  }),
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: vehicles = [] } = useVehicles();
  const { data: favStations = [], isLoading: favsLoading } = useFavouriteStations(user?.id);
  const { data: favIds = [] } = useFavouriteIds(user?.id);
  const toggleFav = useToggleFavourite(user?.id);

  const [fullName, setFullName] = useState("");
  const [vehicleId, setVehicleId] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  // Populate form from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setVehicleId(profile.vehicle_id ?? "none");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile({
        id: user.id,
        full_name: fullName || null,
        vehicle_id: vehicleId === "none" ? null : vehicleId,
      });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Profile</h1>
            <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
          </div>
          <Button
            id="sign-out-btn"
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Profile card */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-card">
            <div className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Account Details
              </h2>

              {profileLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Avatar placeholder */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                      <User className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{fullName || "No name set"}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {user!.email}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Name */}
                  <div>
                    <Label htmlFor="profile-name" className="text-sm">
                      Full Name
                    </Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="profile-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="pl-9 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Vehicle */}
                  <div>
                    <Label htmlFor="profile-vehicle" className="text-sm">
                      <Car className="mr-1 inline h-4 w-4 text-primary" />
                      My Vehicle
                    </Label>
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger id="profile-vehicle" className="mt-1.5 rounded-xl">
                        <SelectValue placeholder="Select your EV" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No vehicle selected</SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.make} {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    id="save-profile-btn"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full gap-2 rounded-full bg-gradient-primary shadow-glow hover:opacity-90"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Favourite stations */}
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Heart className="h-5 w-5 text-primary" />
              Saved Stations
            </h2>
            <div className="mt-4 space-y-3">
              {favsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : favStations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
                  <Heart className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">No favourites yet</p>
                  <Link to="/map">
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5 rounded-full">
                      <MapPin className="h-4 w-4" />
                      Browse Stations
                    </Button>
                  </Link>
                </div>
              ) : (
                favStations.map((s) => (
                  <StationCard
                    key={s.id}
                    station={s}
                    isFav={favIds.includes(s.id)}
                    onToggleFav={() =>
                      toggleFav.mutate({
                        stationId: s.id,
                        isFav: favIds.includes(s.id),
                      })
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

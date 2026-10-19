import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isDemoQuery =
      typeof window !== "undefined" && window.location.search.includes("demo=true");
    const localDemoUser =
      typeof window !== "undefined"
        ? localStorage.getItem("chargehub_user") ||
          (isDemoQuery
            ? '{"id":"demo-user-1","email":"driver@chargehub.com","user_metadata":{"full_name":"EV Driver"}}'
            : null)
        : null;

    if (localDemoUser) {
      try {
        setUser(JSON.parse(localDemoUser) as User);
        setLoading(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("chargehub_user", localDemoUser);
        }
      } catch {
        // ignore
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
      } else if (!localStorage.getItem("chargehub_user")) {
        setUser(null);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPaddleEnvironment } from "@/lib/paddle";

export interface SubscriptionRow {
  id: string;
  status: string;
  product_id: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

export type SubscriptionState = "none" | "active" | "trialing" | "canceled" | "past_due" | "expired";

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const environment = getPaddleEnvironment();

  const query = useQuery({
    queryKey: ["subscription", user?.id, environment],
    enabled: !!user,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("environment", environment)
        .maybeSingle();
      if (error) throw error;
      return data as SubscriptionRow | null;
    },
  });

  // Realtime: invalida cuando el webhook actualiza la fila
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sub-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscription", user.id, environment] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, environment, queryClient]);

  const sub = query.data;
  const now = Date.now();
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const withinPeriod = !periodEnd || periodEnd > now;

  let state: SubscriptionState = "none";
  if (sub) {
    if ((sub.status === "active" || sub.status === "trialing") && withinPeriod) {
      state = sub.status as SubscriptionState;
    } else if (sub.status === "canceled" && withinPeriod) {
      state = "canceled"; // sigue con acceso hasta el final del período
    } else if (sub.status === "past_due") {
      state = "past_due";
    } else {
      state = "expired";
    }
  }

  const isPro = state === "active" || state === "trialing" || state === "canceled";

  return {
    loading: query.isLoading,
    subscription: sub,
    state,
    isPro,
    environment,
    refetch: query.refetch,
  };
}

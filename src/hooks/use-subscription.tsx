import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlanLimits, isPro, PlanTier } from "@/lib/plans";

interface SubscriptionContextType {
  plan: PlanTier;
  isPro: boolean;
  limits: ReturnType<typeof getPlanLimits>;
  loading: boolean;
  currentPeriodEnd: string | null;
  refresh: () => Promise<void>;
  startCheckout: (interval: "monthly" | "yearly") => Promise<string | null>;
  openBillingPortal: () => Promise<string | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children, userId, isGuest }: { children: ReactNode; userId?: string; isGuest?: boolean }) {
  const [plan, setPlan] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || isGuest) {
      setPlan("free");
      setLoading(false);
      return;
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub && sub.status === "active" && sub.plan === "pro") {
      setPlan("pro");
      setCurrentPeriodEnd(sub.current_period_end);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_tier")
        .eq("user_id", userId)
        .maybeSingle();
      setPlan(profile?.plan_tier === "pro" ? "pro" : "free");
      setCurrentPeriodEnd(null);
    }
    setLoading(false);
  }, [userId, isGuest]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startCheckout = useCallback(async (interval: "monthly" | "yearly"): Promise<string | null> => {
    if (!userId) return "Please sign in to upgrade.";
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { interval, userId },
      });
      if (error) return error.message;
      if (data?.url) {
        window.location.href = data.url;
        return null;
      }
      return data?.error || "Checkout unavailable. Configure Stripe in Supabase.";
    } catch {
      return "Checkout unavailable. Configure Stripe edge functions.";
    }
  }, [userId]);

  const openBillingPortal = useCallback(async (): Promise<string | null> => {
    if (!userId) return "Please sign in.";
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { userId },
      });
      if (error) return error.message;
      if (data?.url) {
        window.location.href = data.url;
        return null;
      }
      return "Billing portal unavailable.";
    } catch {
      return "Billing portal unavailable.";
    }
  }, [userId]);

  const tier = plan;
  return (
    <SubscriptionContext.Provider
      value={{
        plan: tier,
        isPro: isPro(tier),
        limits: getPlanLimits(tier),
        loading,
        currentPeriodEnd,
        refresh,
        startCheckout,
        openBillingPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}

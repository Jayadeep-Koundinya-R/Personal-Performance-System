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

  const isGuestUser = isGuest || !userId || userId === "guest_local" || userId.startsWith("guest");

  const refresh = useCallback(async () => {
    if (isGuestUser || !userId) {
      setPlan("free");
      setLoading(false);
      return;
    }

    try {
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
    } catch {
      setPlan("free");
    }
    setLoading(false);
  }, [userId, isGuestUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startCheckout = useCallback(async (interval: "monthly" | "yearly"): Promise<string | null> => {
    if (!userId) return "Please sign in to upgrade.";
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { interval, userId },
      });
      if (error) {
        console.error("Checkout invocation error:", error);
        return error.message || "Failed to launch payment checkout session.";
      }
      if (data?.url) {
        window.location.href = data.url;
        return null;
      }
      return data?.error || "Checkout session unavailable. Please ensure Stripe environment keys are configured.";
    } catch (err: any) {
      console.error("Checkout exception:", err);
      return err?.message || "Checkout service is currently unreachable. Please check your internet connection.";
    }
  }, [userId]);

  const openBillingPortal = useCallback(async (): Promise<string | null> => {
    if (!userId) return "Please sign in to access billing management.";
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { userId },
      });
      if (error) {
        console.error("Billing portal error:", error);
        return error.message || "Failed to open billing portal.";
      }
      if (data?.url) {
        window.location.href = data.url;
        return null;
      }
      return data?.error || "Billing management is currently unavailable for your account.";
    } catch (err: any) {
      console.error("Portal exception:", err);
      return err?.message || "Billing portal service is unreachable.";
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

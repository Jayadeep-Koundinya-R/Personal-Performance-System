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

  const startCheckout = useCallback(async (_interval: "monthly" | "yearly"): Promise<string | null> => {
    // Agni Launch: Honest Early Access Beta handling
    toast.info("🚀 Student Pro is Free in Early Access Beta!", {
      description: "Payment gateways (UPI & Stripe) will activate during official commercial launch. All Pro features are unlocked for testing.",
      duration: 5000,
    });
    return null;
  }, []);

  const openBillingPortal = useCallback(async (): Promise<string | null> => {
    toast.info("💳 Billing Portal", {
      description: "You are currently on the complimentary Early Access Beta tier with ₹0 charge.",
      duration: 4000,
    });
    return null;
  }, []);

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

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlanLimits, isPro, PlanTier } from "@/lib/plans";
import { toast } from "sonner";

interface SubscriptionContextType {
  plan: PlanTier;
  isPro: boolean;
  limits: ReturnType<typeof getPlanLimits>;
  loading: boolean;
  currentPeriodEnd: string | null;
  refresh: () => Promise<void>;
  startCheckout: (intervalOrPriceId?: "monthly" | "yearly" | string, explicitPriceId?: string) => Promise<string | null>;
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

  const startCheckout = useCallback(async (
    intervalOrPriceId?: "monthly" | "yearly" | string,
    explicitPriceId?: string
  ): Promise<string | null> => {
    if (isGuestUser || !userId) {
      toast.error("Authentication Required", {
        description: "Please sign in or create an account to subscribe to Student Pro.",
      });
      return "auth_required";
    }

    try {
      const isYearly = intervalOrPriceId === "yearly";
      const interval = isYearly ? "yearly" : "monthly";

      const envPriceId = isYearly
        ? (import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID as string)
        : (import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string);

      const targetPriceId =
        explicitPriceId ||
        (typeof intervalOrPriceId === "string" && intervalOrPriceId.startsWith("price_")
          ? intervalOrPriceId
          : envPriceId);

      toast.loading("Preparing secure Stripe Checkout...", { id: "stripe-checkout" });

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          interval,
          priceId: targetPriceId || undefined,
        },
      });

      if (error) {
        toast.dismiss("stripe-checkout");
        const errMsg = error.message || "Failed to initiate Stripe Checkout.";
        toast.error("Checkout Error", { description: errMsg });
        return errMsg;
      }

      if (data?.url) {
        toast.success("Redirecting to Stripe...", { id: "stripe-checkout" });
        window.location.href = data.url;
        return null;
      }

      toast.dismiss("stripe-checkout");
      toast.error("Checkout Failed", { description: "No checkout URL returned from server." });
      return "no_checkout_url";
    } catch (err: any) {
      toast.dismiss("stripe-checkout");
      const errMsg = err?.message || "Network error connecting to checkout.";
      toast.error("Checkout Error", { description: errMsg });
      return errMsg;
    }
  }, [isGuestUser, userId]);

  const openBillingPortal = useCallback(async (): Promise<string | null> => {
    if (isGuestUser || !userId) {
      toast.error("Authentication Required", {
        description: "Please sign in to access your billing portal.",
      });
      return "auth_required";
    }

    try {
      toast.loading("Loading billing portal...", { id: "billing-portal" });
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { userId },
      });

      if (error) {
        toast.dismiss("billing-portal");
        toast.error("Billing Portal", {
          description: error.message || "No active billing customer found.",
        });
        return error.message;
      }

      if (data?.url) {
        toast.dismiss("billing-portal");
        window.location.href = data.url;
        return null;
      }

      toast.dismiss("billing-portal");
      toast.error("Billing portal unavailable.");
      return "no_portal_url";
    } catch (err: any) {
      toast.dismiss("billing-portal");
      toast.error("Billing Portal", { description: err?.message || "Network error." });
      return err?.message;
    }
  }, [isGuestUser, userId]);

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

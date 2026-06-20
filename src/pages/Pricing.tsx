import { Link } from "react-router-dom";
import { PRICING } from "@/lib/plans";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription, SubscriptionProvider } from "@/hooks/use-subscription";

const FEATURES = [
  { name: "Active habits", free: "Up to 5", pro: "Unlimited" },
  { name: "Streak + XP", free: "✓", pro: "✓" },
  { name: "Analytics", free: "7-day", pro: "Full history + heatmap" },
  { name: "Reflections", free: "7-day history", pro: "Unlimited + mood trends" },
  { name: "Reminders", free: "1 reminder", pro: "Unlimited + email" },
  { name: "Achievements", free: "Core 6 badges", pro: "All + seasonal" },
  { name: "Streak freeze", free: "1/month", pro: "3/month + shield" },
  { name: "Social", free: "View leaderboard", pro: "Friends + circles + share cards" },
  { name: "AI Coach", free: "—", pro: "Weekly summary" },
];

function PricingContent() {
  const { isLoggedIn } = useAuth();
  const { isPro, startCheckout, loading } = useSubscription();

  const checkout = async (interval: "monthly" | "yearly") => {
    if (!isLoggedIn) {
      window.location.href = `${import.meta.env.BASE_URL}login?tab=signup`;
      return;
    }
    await startCheckout(interval);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border max-w-6xl mx-auto">
        <Link to="/" className="font-mono text-xl font-bold text-primary tracking-[2px]">
          PPS<span className="text-secondary">.</span>
        </Link>
        <Link to={isLoggedIn ? "/dashboard" : "/login"} className="text-[13px] text-muted-foreground hover:text-foreground">
          {isLoggedIn ? "Dashboard" : "Login"}
        </Link>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold mb-3">Simple, honest pricing</h1>
        <p className="text-muted-foreground mb-10">Free to start. Pro when you're ready to go deeper.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Free</div>
            <div className="text-3xl font-bold mt-2">$0</div>
            <p className="text-[13px] text-muted-foreground mt-2">Generous free tier for getting started</p>
            <Link to="/login?tab=signup" className="mt-6 block text-center border border-border py-2.5 rounded-xl text-sm font-semibold hover:border-primary">
              Get Started
            </Link>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 rounded-2xl p-8 relative">
            {isPro && <span className="absolute top-4 right-4 text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Current</span>}
            <div className="text-sm font-semibold text-primary uppercase tracking-wider">Pro</div>
            <div className="text-3xl font-bold mt-2">${PRICING.proMonthly}<span className="text-base font-normal text-muted-foreground">/mo</span></div>
            <p className="text-[13px] text-muted-foreground mt-2">or ${PRICING.proYearly}/year (save ~44%)</p>
            <div className="flex flex-col gap-2 mt-6">
              <button
                disabled={loading || isPro}
                onClick={() => checkout("monthly")}
                className="bg-gradient-to-br from-primary to-[#8b5cf6] text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {isPro ? "Active Plan" : "Upgrade Monthly"}
              </button>
              <button
                disabled={loading || isPro}
                onClick={() => checkout("yearly")}
                className="border border-primary/30 text-primary py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Upgrade Yearly
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-lg font-bold mb-4 text-center">Compare plans</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="text-left p-3">Feature</th>
                <th className="p-3">Free</th>
                <th className="p-3 text-primary">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.name} className="border-b border-border/50">
                  <td className="p-3">{f.name}</td>
                  <td className="p-3 text-center text-muted-foreground">{f.free}</td>
                  <td className="p-3 text-center">{f.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-[12px] text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground mr-4">Privacy</Link>
        <Link to="/terms" className="hover:text-foreground">Terms</Link>
      </footer>
    </div>
  );
}

export default function PricingPage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user && !user.isGuest) {
    return (
      <SubscriptionProvider userId={user.id} isGuest={false}>
        <PricingContent />
      </SubscriptionProvider>
    );
  }

  return (
    <SubscriptionProvider userId={undefined} isGuest>
      <PricingContent />
    </SubscriptionProvider>
  );
}

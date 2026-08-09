/*
  💰 Premium Pricing Page with Manual Country / Location Selector
  
  Features:
  - Explicit Country/Location Selection (India vs. International)
  - Remembers user choice in localStorage ("pps_billing_region")
  - Monthly/Yearly toggle with dynamic savings calculation
  - Enhanced plan cards with localized currency display
  - Expanded 16-row feature comparison table
  - FAQ accordion
  - Money-back guarantee trust signals
  - Framer Motion animations
*/

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { REGIONAL_PRICING, CurrencyRegion } from "@/lib/plans";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription, SubscriptionProvider } from "@/hooks/use-subscription";
import { Globe, MapPin, Check, ChevronDown } from "lucide-react";

/* ── feature comparison data ────────────────────────── */

const FEATURES = [
  { category: "Core", name: "Active Habits", free: "Up to 15", pro: "Unlimited" },
  { category: "Core", name: "Streak Tracking & XP", free: "✓", pro: "✓" },
  { category: "Core", name: "Daily Tracker & Calendar", free: "✓", pro: "✓" },
  { category: "Core", name: "Focus Studio (Pomodoro)", free: "✓", pro: "✓" },
  { category: "Analytics", name: "Analytics History", free: "7-day", pro: "Full history" },
  { category: "Analytics", name: "Energy Correlation & Heatmaps", free: "—", pro: "✓" },
  { category: "Analytics", name: "AI Level Velocity Forecast", free: "—", pro: "✓" },
  { category: "Analytics", name: "Executive PDF Reports", free: "✓", pro: "✓ + Branding" },
  { category: "Social", name: "Leaderboard Access", free: "View only", pro: "Full + Compete" },
  { category: "Social", name: "Accountability Circles", free: "—", pro: "✓" },
  { category: "Social", name: "Co-Op Quests & Share Cards", free: "—", pro: "✓" },
  { category: "Advanced", name: "Reflections History", free: "7-day", pro: "Unlimited + Trends" },
  { category: "Advanced", name: "Streak Freezes", free: "1/month", pro: "3/month + Auto-Shield" },
  { category: "Advanced", name: "AI Performance Coach", free: "10 messages", pro: "Unlimited" },
  { category: "Advanced", name: "Achievements & Badges", free: "Core 6", pro: "All + Seasonal" },
  { category: "Advanced", name: "Priority Support", free: "—", pro: "✓" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Absolutely. You can cancel your Pro subscription at any time from your Settings page. You'll keep Pro features until the end of your billing period." },
  { q: "Is there a free trial?", a: "Yes! The free tier is fully functional with up to 15 habits, streak tracking, XP leveling, achievements, and 7-day analytics. No time limit." },
  { q: "What payment methods do you accept?", a: "We accept UPI, NetBanking, Paytm, Credit/Debit cards for India, and Visa, Mastercard, Amex, PayPal for international payments." },
  { q: "How is pricing calculated for my country?", a: "Select your billing country above. We offer localized pricing for India (₹199/mo or $2.63/mo) and standard international pricing ($9.99/mo) for other countries." },
  { q: "Do you offer refunds?", a: "Yes — we offer a 30-day money-back guarantee. If Pro isn't for you, email us within 30 days for a full refund, no questions asked." },
  { q: "Can I switch between monthly and yearly?", a: "Yes. You can switch between billing intervals at any time from your Settings page. Changes take effect at the start of your next billing cycle." },
];

/* ── animation variants ──────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" } }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ── inner component ─────────────────────────────────── */

function PricingContent() {
  const { isLoggedIn } = useAuth();
  const { isPro, startCheckout, loading } = useSubscription();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [region, setRegionState] = useState<CurrencyRegion>(() => {
    const saved = localStorage.getItem("pps_billing_region");
    return saved === "IN" || saved === "GLOBAL" ? saved : "IN";
  });
  
  const [showCountryModal, setShowCountryModal] = useState(() => !localStorage.getItem("pps_billing_region"));
  const [countryInput, setCountryInput] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const selectRegion = (r: CurrencyRegion) => {
    setRegionState(r);
    localStorage.setItem("pps_billing_region", r);
    setShowCountryModal(false);
  };

  const handleCountrySubmit = () => {
    const text = countryInput.trim().toLowerCase();
    if (!text) return;
    if (text.includes("india") || text === "in" || text.includes("bharat")) {
      selectRegion("IN");
    } else {
      selectRegion("GLOBAL");
    }
  };

  const pricingConfig = REGIONAL_PRICING[region];
  const symbol = pricingConfig.currencySymbol;

  const perMonthDisplay = useMemo(() => {
    if (interval === "monthly") {
      return region === "IN" ? `₹199` : `$9.99`;
    } else {
      return region === "IN" ? `₹166` : `$8.33`;
    }
  }, [interval, region]);

  const yearlyTotalDisplay = useMemo(() => {
    return region === "IN" ? `₹1,999` : `$99.99`;
  }, [region]);

  const usdEquivalent = useMemo(() => {
    if (region === "IN") {
      return interval === "monthly" ? " ($2.63 USD)" : " ($26.26 USD)";
    }
    return "";
  }, [interval, region]);

  const checkout = async () => {
    if (!isLoggedIn) {
      window.location.href = `${import.meta.env.BASE_URL}login?tab=signup`;
      return;
    }
    await startCheckout(interval);
  };

  const categories = [...new Set(FEATURES.map(f => f.category))];

  return (
    <div className="min-h-screen bg-background text-foreground relative">

      {/* ═══════════ ANIMATED COUNTRY DETECTION MODAL ═══════════ */}
      <AnimatePresence>
        {showCountryModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
            onClick={() => setShowCountryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-card border border-border/80 rounded-3xl p-7 max-w-md w-full text-center shadow-2xl space-y-5 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-2xl mx-auto shadow-inner">
                📍
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-foreground">
                  Select Billing Location
                </h2>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Enter your country to view accurate localized pricing.
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Country or Location</label>
                  <input
                    type="text"
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    placeholder="e.g. India, United States, United Kingdom..."
                    className="w-full bg-surface border border-border px-4 py-3 rounded-xl text-foreground text-[13.5px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all mt-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCountrySubmit();
                    }}
                  />
                </div>

                <div className="pt-1">
                  <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Or Quick Select:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => selectRegion("IN")}
                      className="p-3 rounded-xl border border-border bg-surface hover:border-primary/50 text-left transition-all cursor-pointer font-semibold text-xs flex items-center justify-between"
                    >
                      <span>🇮🇳 India</span>
                      <span className="text-[11px] font-mono text-primary">₹199</span>
                    </button>

                    <button
                      onClick={() => selectRegion("GLOBAL")}
                      className="p-3 rounded-xl border border-border bg-surface hover:border-primary/50 text-left transition-all cursor-pointer font-semibold text-xs flex items-center justify-between"
                    >
                      <span>🌐 Other Countries</span>
                      <span className="text-[11px] font-mono text-primary">$9.99</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {countryInput.trim() && (
                  <button
                    onClick={handleCountrySubmit}
                    className="w-full bg-gradient-to-br from-primary to-accent text-white py-3 rounded-xl text-xs font-extrabold hover:opacity-90 transition-opacity cursor-pointer shadow-md"
                  >
                    Unlock Localized Pricing →
                  </button>
                )}
                <button
                  onClick={() => setShowCountryModal(false)}
                  className="w-full py-2 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none"
                >
                  Close & View Default
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-7xl mx-auto">
          <Link to="/" className="font-mono text-xl font-extrabold text-primary tracking-[3px]">
            PPS<span className="text-secondary">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-surface">Home</Link>
            <Link to={isLoggedIn ? "/dashboard" : "/login"} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-surface">
              {isLoggedIn ? "Dashboard" : "Login"}
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="max-w-4xl mx-auto px-6 pt-14 pb-6 text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} custom={0}
            className="inline-block text-[11px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3.5 py-1 rounded-full mb-5 uppercase tracking-wider"
          >
            Transparent Pro Pricing
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl font-extrabold mb-3">
            Simple, <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">honest</span> pricing
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-lg mx-auto mb-6">
            Free to start. Pro when you're ready to level up your habits. Select your billing location below to view local pricing.
          </motion.p>

          {/* MANUAL LOCATION SELECTOR CARD */}
          <motion.div variants={fadeUp} custom={3} className="max-w-md mx-auto mb-8 bg-card border border-border/80 rounded-2xl p-4 shadow-sm text-left">
            <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Selected Location:</span>
              </span>
              <button
                onClick={() => setShowCountryModal(true)}
                className="text-primary hover:underline text-[11px] font-semibold cursor-pointer bg-transparent border-none"
              >
                Change Country 📍
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => selectRegion("IN")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  region === "IN"
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border/80 bg-surface hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>🇮🇳 India</span>
                  {region === "IN" && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  ₹199/mo <span className="text-[9.5px]">($2.63)</span>
                </div>
              </button>

              <button
                onClick={() => selectRegion("GLOBAL")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  region === "GLOBAL"
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border/80 bg-surface hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>🌐 Other Countries</span>
                  {region === "GLOBAL" && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  $9.99/mo <span className="text-[9.5px]">($99/yr)</span>
                </div>
              </button>
            </div>
          </motion.div>

          {/* Monthly / Yearly Toggle */}
          <motion.div variants={fadeUp} custom={4} className="flex items-center justify-center gap-3 mb-10">
            <span className={`text-sm font-semibold transition-colors ${interval === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setInterval(interval === "monthly" ? "yearly" : "monthly")}
              className={`w-14 h-7 rounded-full p-1 transition-all duration-300 cursor-pointer ${
                interval === "yearly" ? "bg-primary" : "bg-surface border border-border"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                interval === "yearly" ? "translate-x-7" : "translate-x-0"
              }`} />
            </button>
            <span className={`text-sm font-semibold transition-colors ${interval === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {interval === "yearly" && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[11px] font-extrabold text-pps-green bg-pps-green/10 border border-pps-green/20 px-2.5 py-1 rounded-full"
              >
                Save 44% (2 Months Free)
              </motion.span>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ PLAN CARDS ═══════════ */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border/60 rounded-2xl p-8 hover:border-border transition-all"
          >
            <div className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Free</div>
            <div className="text-4xl font-extrabold font-mono mb-1">{symbol}0</div>
            <p className="text-[13px] text-muted-foreground mb-6">Generous free tier — no credit card needed</p>
            <div className="space-y-3 mb-8">
              {["Up to 15 active habits", "Streak tracking & XP leveling", "Focus Studio (Pomodoro timer)", "7-day analytics & reflections", "Core achievements (6 badges)", "10 AI Coach messages", "Executive PDF reports"].map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-[13px]">
                  <span className="text-pps-green font-bold mt-0.5">✓</span>
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Link to="/login?tab=signup"
              className="block text-center border border-border py-3 rounded-xl text-sm font-bold hover:border-primary/50 hover:bg-surface transition-all"
            >
              Get Started Free
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-gradient-to-br from-primary/10 via-card to-secondary/5 border-2 border-primary/40 rounded-2xl p-8 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all"
          >
            {/* Most Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-[11px] font-extrabold bg-primary text-primary-foreground px-4 py-1.5 rounded-full shadow-md shadow-primary/30 uppercase tracking-wider flex items-center gap-1">
                <span>{pricingConfig.flag}</span>
                <span>{region === "IN" ? "India Pricing" : "Most Popular"}</span>
              </span>
            </div>

            {isPro && <span className="absolute top-4 right-4 text-[11px] bg-pps-green text-white px-2.5 py-1 rounded-full font-bold">Active ✓</span>}

            <div className="text-sm font-extrabold text-primary uppercase tracking-wider mb-2 mt-2">Pro Tier</div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-4xl font-extrabold font-mono">{perMonthDisplay}</span>
              <span className="text-muted-foreground text-sm font-medium">/month</span>
              <span className="text-[11px] text-muted-foreground font-mono">{usdEquivalent}</span>
            </div>
            {interval === "yearly" && (
              <p className="text-[12px] text-muted-foreground mb-1">Billed {yearlyTotalDisplay}/year (Save ~44%)</p>
            )}
            <p className="text-[13px] text-muted-foreground mb-6">Everything in Free, plus:</p>

            <div className="space-y-3 mb-8">
              {["Unlimited active habits", "Full analytics history & heatmaps", "AI Level Velocity Forecast", "Unlimited AI Coach messages", "All achievements + seasonal badges", "3 streak freezes/month + auto-shield", "Accountability circles & co-op quests", "Share cards without watermarks", "Priority support"].map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-[13px]">
                  <span className="text-primary font-bold mt-0.5">✦</span>
                  <span className="text-foreground font-medium">{f}</span>
                </div>
              ))}
            </div>

            <button
              disabled={loading || isPro}
              onClick={checkout}
              className="w-full bg-gradient-to-br from-primary to-accent text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 shadow-md cursor-pointer"
            >
              {isPro ? "Active Plan ✓" : `Upgrade to Pro — ${perMonthDisplay}/mo`}
            </button>
          </motion.div>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8 flex-wrap">
          {[
            { icon: "🔒", text: "Secure Checkout" },
            { icon: "💳", text: "Cancel Anytime" },
            { icon: "🛡️", text: "30-Day Guarantee" },
            { icon: pricingConfig.flag, text: `Selected: ${pricingConfig.regionName}` },
          ].map((t) => (
            <div key={t.text} className="flex items-center gap-2 text-[12px] text-muted-foreground font-medium">
              <span>{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ COMPARISON TABLE ═══════════ */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-extrabold text-center mb-8">Compare <span className="text-primary">plans</span> in detail</h2>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-lg"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left p-4 font-bold text-muted-foreground">Feature</th>
                  <th className="p-4 font-bold text-center">Free</th>
                  <th className="p-4 font-extrabold text-primary text-center">Pro ({pricingConfig.currencySymbol}) ✦</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <> 
                    <tr key={`cat-${cat}`} className="bg-surface/30">
                      <td colSpan={3} className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {cat}
                      </td>
                    </tr>
                    {FEATURES.filter(f => f.category === cat).map((f) => (
                      <tr key={f.name} className="border-b border-border/30 hover:bg-surface/20 transition-colors">
                        <td className="p-4 font-medium">{f.name}</td>
                        <td className="p-4 text-center text-muted-foreground">{f.free}</td>
                        <td className="p-4 text-center font-semibold">{f.pro}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-extrabold text-center mb-8">Frequently asked <span className="text-primary">questions</span></h2>

        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border/60 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-surface/50 transition-colors"
              >
                <span className="font-bold text-sm text-foreground">{f.q}</span>
                <span className="text-muted-foreground text-lg ml-4 flex-shrink-0 transition-transform duration-200" style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}>
                  +
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {f.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-primary/15 via-card to-secondary/10 border border-primary/20 rounded-2xl p-10 text-center"
        >
          <h2 className="text-2xl font-extrabold mb-3">Still deciding?</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Start free with 15 habits, full streak tracking, and 7-day analytics. Upgrade to Pro whenever you're ready — no pressure.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/login?tab=signup"
              className="bg-gradient-to-br from-primary to-accent text-white py-3 px-8 rounded-xl text-sm font-bold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 shadow-md"
            >
              Get Started Free →
            </Link>
            <Link to="/"
              className="text-sm text-foreground border border-border/80 py-3 px-6 rounded-xl hover:border-primary/50 hover:bg-surface transition-all font-semibold"
            >
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border/60 bg-surface/20 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} <span className="font-mono font-bold text-primary">PPS</span><span className="text-secondary">.</span> — Personal Performance System
          </div>
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── wrapper with provider ───────────────────────────── */

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

import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="px-6 py-4 border-b border-border max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-mono text-xl font-extrabold text-primary">
          PPS<span className="text-secondary">.</span>
        </Link>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </Link>
      </nav>
      <article className="max-w-4xl mx-auto px-6 py-12 prose prose-invert prose-sm space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Terms of Service</h1>
          <p className="text-xs font-mono text-muted-foreground">Effective Date: August 12, 2026 | UpaLakshya Labs</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Welcome to the Personal Performance System ("PPS", "Service", "Platform"), operated by UpaLakshya Labs ("Company", "we", "us", or "our"). By accessing or using our website, application, or services, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. Description of Service</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            PPS is a personal habit tracking, productivity analytics, focus studio, and gamified personal growth platform. We provide both free tier services and paid subscription tiers ("Pro", "Institution") with advanced analytics, unlimited habits, social features, and AI-assisted coaching.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. Account Registration & Security</h2>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1 leading-relaxed">
            <li>You must provide accurate, complete information when creating an account.</li>
            <li>You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</li>
            <li>Guest mode operates strictly via local browser storage (localStorage). Data created in Guest mode is un-synced until you register an account.</li>
            <li>You must notify us immediately at <span className="font-mono text-primary">security@upalakshya.com</span> upon discovering any unauthorized use of your account.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. Subscriptions, Pricing & Billing</h2>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <li><strong>Billing Cycle:</strong> Pro subscriptions are billed in advance on a recurring monthly or annual basis depending on your selection.</li>
            <li><strong>Regional Pricing:</strong> We offer localized purchasing power parity (PPP) pricing (e.g. ₹199/month in India) and standard international pricing ($9.99/month). Billing is processed securely via Stripe.</li>
            <li><strong>Auto-Renewal:</strong> Your subscription automatically renews at the end of each billing period unless cancelled prior to renewal through your Settings page billing portal.</li>
            <li><strong>30-Day Money-Back Guarantee:</strong> If you are dissatisfied with PPS Pro within 30 days of initial purchase, contact support at <span className="font-mono text-primary">billing@upalakshya.com</span> for a full, no-questions-asked refund.</li>
            <li><strong>Price Changes:</strong> We reserve the right to adjust pricing upon 30 days' advance notice to active subscribers.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. User Conduct & Acceptable Use</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You agree not to modify, reverse-engineer, decompile, or attempt to extract source code from PPS. You must not use automated tools, bots, or scrapers to access the platform, bypass usage limits, or disrupt platform infrastructure.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">5. Intellectual Property Rights</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All rights, title, and interest in and to PPS (excluding user-generated habit entries and reflections) — including software, interface design, logos, trademarks, and gamification architecture — are the exclusive property of UpaLakshya Labs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">6. Limitation of Liability</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            To the maximum extent permitted by applicable law, UpaLakshya Labs shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising out of or in connection with your use of PPS.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">7. Contact & Support</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            For questions regarding these Terms or billing inquiries, please contact us at:
            <br />
            <span className="font-mono text-primary font-bold">legal@upalakshya.com</span> | <span className="font-mono text-primary font-bold">support@upalakshya.com</span>
          </p>
        </section>
      </article>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <ScrollProgressBar />

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
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-xs font-mono text-muted-foreground">Effective Date: August 12, 2026 | UpaLakshya Labs</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          At UpaLakshya Labs ("Company", "we", "us"), respecting your privacy and safeguarding your personal information is fundamental to building the Personal Performance System ("PPS"). This Privacy Policy explains how we collect, use, store, disclosure, and safeguard your information when you use our web application and services.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. Information We Collect</h2>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p><strong>A. Account & Contact Data:</strong> When registering, we collect your email address, display name, username, and authentication metadata.</p>
            <p><strong>B. Application & Performance Data:</strong> Your habit names, completion timestamps, streaks, category tags, daily reflections, energy levels, reminder schedules, and gamification points (XP/Level).</p>
            <p><strong>C. Billing & Payment Data:</strong> All payments are processed directly via Stripe. We do not store full credit card numbers, CVVs, or bank details on our servers. We receive payment confirmation tokens and subscription status from Stripe.</p>
            <p><strong>D. Guest Mode Data:</strong> Operating in Guest mode stores all habits and entries purely within your local web browser's storage (localStorage/sessionStorage). No local Guest data is transmitted to our cloud backend until you voluntarily register or sign in.</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1 leading-relaxed">
            <li>To provide, maintain, and personalize habit tracking, focus tools, and performance analytics.</li>
            <li>To sync your habits and reflections across your devices via Supabase cloud database.</li>
            <li>To facilitate social features (leaderboards, co-op quests, accountability circles) when enabled.</li>
            <li>To process paid subscriptions, issue receipts, and manage account privileges.</li>
            <li>To send critical system alerts, product updates, or transactional emails.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. Storage & Row Level Security (RLS)</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your data is stored in PostgreSQL database infrastructure managed by Supabase, protected by strict Row Level Security (RLS) policies. This ensures that your private habits, reflections, and reminders can only be accessed by your authenticated user ID.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. Data Export, Portability & Deletion Rights</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You maintain full ownership of your data. You may download a complete backup of your habits and reflections in JSON or CSV format at any time directly from the Settings page. You may also request complete deletion of your account and cloud data by contacting <span className="font-mono text-primary font-bold">privacy@upalakshya.com</span>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">5. Third-Party Service Providers</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We share minimal necessary data with trusted service providers strictly to operate PPS:
          </p>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1 leading-relaxed">
            <li><strong>Supabase:</strong> Authentication & Cloud Database Hosting</li>
            <li><strong>Stripe:</strong> Secure Payment Processing & Subscription Billing</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">6. Contact Information</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact our Data Protection Officer at:
            <br />
            <span className="font-mono text-primary font-bold">privacy@upalakshya.com</span>
          </p>
        </section>
      </article>

      {/* 🚀 Floating Scroll to Top */}
      <ScrollToTop />
    </div>
  );
}


import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="px-6 py-4 border-b border-border max-w-3xl mx-auto">
        <Link to="/" className="font-mono font-bold text-primary">PPS.</Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <h1>Privacy Policy</h1>
        <p>Last updated: June 20, 2026</p>
        <p>
          UpaLakshya Labs ("we", "PPS") operates the Personal Performance System. This policy explains how we collect, use, and protect your data.
        </p>
        <h2>Data we collect</h2>
        <ul>
          <li>Account information: email, display name, username</li>
          <li>Habit data: habits, completions, streaks, reflections, reminders</li>
          <li>Usage data: analytics events, subscription status</li>
          <li>Payment data: processed by Stripe; we do not store card numbers</li>
        </ul>
        <h2>How we use data</h2>
        <p>We use your data to provide habit tracking, sync across devices, social features, and subscription billing.</p>
        <h2>Data storage</h2>
        <p>Data is stored securely in Supabase (PostgreSQL) with row-level security. Each user can only access their own data.</p>
        <h2>Your rights</h2>
        <p>You may export or delete your data from Settings. Contact support for full account deletion requests.</p>
        <h2>Contact</h2>
        <p>privacy@upalakshya.com</p>
      </article>
    </div>
  );
}

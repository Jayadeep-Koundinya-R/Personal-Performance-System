import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="px-6 py-4 border-b border-border max-w-3xl mx-auto">
        <Link to="/" className="font-mono font-bold text-primary">PPS.</Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <h1>Terms of Service</h1>
        <p>Last updated: June 20, 2026</p>
        <p>By using PPS (Personal Performance System), you agree to these terms.</p>
        <h2>Service</h2>
        <p>PPS is a habit tracking and personal performance application provided by UpaLakshya Labs.</p>
        <h2>Accounts</h2>
        <p>You are responsible for maintaining the security of your account. Guest mode data is stored locally and not synced.</p>
        <h2>Subscriptions</h2>
        <p>Pro subscriptions renew automatically unless cancelled via the billing portal. Refunds are handled per Stripe policy.</p>
        <h2>Acceptable use</h2>
        <p>Do not abuse the service, attempt unauthorized access, or use automated tools to circumvent usage limits.</p>
        <h2>Limitation of liability</h2>
        <p>PPS is provided "as is" without warranties. We are not liable for indirect damages arising from use of the service.</p>
        <h2>Contact</h2>
        <p>legal@upalakshya.com</p>
      </article>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CurrencyRegion, REGIONAL_PRICING } from "@/lib/plans";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { trackEvent } from "@/lib/telemetry/telemetry";
import { feedbackSounds } from "@/lib/audio/clickFeedback";
import {
  Zap,
  ShieldCheck,
  X,
  CheckCircle2,
  Mail,
  Copy,
  Check,
  QrCode,
  ArrowRight,
  ExternalLink,
  Sparkles,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  region: CurrencyRegion;
  interval?: "monthly" | "yearly";
  onSuccess?: () => void;
}

const SUPPORT_EMAIL = "upalakshyasupport@gmail.com";

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  region,
  interval = "monthly",
  onSuccess,
}) => {
  const { user } = useAuth();
  const { refresh } = useSubscription();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [isActivatingSandbox, setIsActivatingSandbox] = useState(false);

  const pricing = REGIONAL_PRICING[region] || REGIONAL_PRICING.IN;
  const isIndia = region === "IN";
  const amount = interval === "monthly" ? pricing.proMonthly : pricing.proYearly;
  const priceDisplay = `${pricing.currencySymbol}${amount}/${interval === "monthly" ? "mo" : "yr"}`;

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const planTitle = `Student Pro (${interval === "yearly" ? "Annual" : "Monthly"})`;
  const userIdentifier = user?.email || (user as any)?.name || "PPS Student";

  const rawSubject = `Upgrade to PPS ${planTitle} - Payment QR / Mobile Number Request`;
  const rawBody = `Hi UpaLakshya Support Team,

I would like to upgrade my Personal Performance System (PPS) account to Student Pro.

• Selected Plan: ${planTitle}
• Amount: ${priceDisplay}
• User Account: ${userIdentifier}
• Payment Preference: UPI (GPay / PhonePe / Paytm / BHIM) or Mobile Number Transfer

Please reply with the official UPI QR code or mobile number so I can complete payment and send you the confirmation screenshot.

Thank you!`;

  const mailSubjectEncoded = encodeURIComponent(rawSubject);
  const mailBodyEncoded = encodeURIComponent(rawBody);

  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${mailSubjectEncoded}&body=${mailBodyEncoded}`;
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${mailSubjectEncoded}&body=${mailBodyEncoded}`;

  const handleCopyEmail = () => {
    feedbackSounds.playClick();
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopiedEmail(true);
    toast.success("📋 Support Email Copied!", {
      description: `${SUPPORT_EMAIL} copied to clipboard.`,
    });
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleCopyBody = () => {
    feedbackSounds.playClick();
    navigator.clipboard.writeText(rawBody);
    setCopiedBody(true);
    toast.success("📋 Predefined Email Text Copied!", {
      description: "You can paste this directly into any email app.",
    });
    setTimeout(() => setCopiedBody(false), 2500);
  };

  const handleOpenGmailWeb = () => {
    feedbackSounds.playClick();
    trackEvent("checkout_gmail_web_opened", {
      email: SUPPORT_EMAIL,
      plan: planTitle,
      price: priceDisplay,
    });
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    window.open(gmailWebUrl, "_blank", "noopener,noreferrer");
    toast.success("🚀 Opening Gmail Composer...", {
      description: "Pre-filled with your plan & payment QR request!",
    });
  };

  const handleOpenMailClient = () => {
    feedbackSounds.playClick();
    trackEvent("checkout_mailto_opened", {
      email: SUPPORT_EMAIL,
      plan: planTitle,
      price: priceDisplay,
    });
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    window.location.href = mailtoUrl;
    toast.success("✉️ Launching Mail Client...", {
      description: "Pre-filled with your plan & payment QR request!",
    });
  };

  // Instant developer / sandbox bypass for testing
  const handleInstantSandboxUnlock = async () => {
    feedbackSounds.playClick();
    setIsActivatingSandbox(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      localStorage.setItem("pps_plan", "pro");
      feedbackSounds.playLevelUp();
      toast.success("✨ Student Pro Activated (Test Sandbox)!", {
        description: "Full Pro capabilities unlocked for this browser session.",
      });
      refresh();
      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setIsActivatingSandbox(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-card/95 border border-primary/30 rounded-3xl shadow-2xl p-6 sm:p-7 max-w-lg w-full relative overflow-hidden backdrop-blur-2xl my-8 max-h-[90vh] flex flex-col"
        >
          {/* Subtle Ambient Header Gradient */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-cyan-400 to-amber-400" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-colors cursor-pointer"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl text-primary flex-shrink-0 shadow-md">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-mono text-foreground">
                  Upgrade to Student Pro
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold bg-primary/15 text-primary border-primary/30">
                  DIRECT UPI / QR
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Direct activation via {SUPPORT_EMAIL}
              </p>
            </div>
          </div>

          <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {/* Price & Plan Card */}
            <div className="p-4 rounded-2xl bg-surface/80 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground">{planTitle}</span>
                  <p className="text-[11px] text-muted-foreground">Unlimited habits, Gemini AI coach & 24/7 squads</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-primary font-mono">{priceDisplay}</div>
                  <div className="text-[10px] text-muted-foreground">Billed {interval}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Payment Mode:</span>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-primary" />
                  <span>UPI QR Code / Mobile Number</span>
                </span>
              </div>
            </div>

            {/* How It Works */}
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Zero-Hassle Direct Payment Process:</span>
              </div>
              <ol className="space-y-1 text-muted-foreground list-decimal pl-4 leading-relaxed text-[11px]">
                <li>Click <strong>Open in Gmail</strong> or <strong>Launch Mail App</strong> below (the plan and pricing are automatically pre-filled!).</li>
                <li>Our team will reply with the official payment QR code or mobile number.</li>
                <li>Send your payment screenshot in reply to activate your Pro account instantly.</li>
              </ol>
            </div>

            {/* Predefined Email Preview Box */}
            <div className="p-3 rounded-2xl bg-card border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted-foreground">Predefined Message (Auto-Filled):</span>
                <button
                  type="button"
                  onClick={handleCopyBody}
                  className="text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  {copiedBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedBody ? "Copied" : "Copy Text"}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/90 border border-border/50 text-[11px] font-mono text-foreground/90 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                {rawBody}
              </div>
            </div>

            {/* Value Props Checklist */}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-foreground text-[11px]">Unlimited habits, time-window locks & circadian blocks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-foreground text-[11px]">24/7 Drop-In Study Squads with high-fidelity video</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-foreground text-[11px]">Direct founder contact & 30-day money-back guarantee</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-border/50 flex-shrink-0">
            {/* Primary: Open in Gmail Web */}
            <button
              type="button"
              onClick={handleOpenGmailWeb}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground font-black text-xs cursor-pointer transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Compose Directly in Gmail Web ({priceDisplay})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Secondary Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenMailClient}
                className="flex-1 py-2.5 rounded-xl border border-border/80 bg-surface hover:bg-surface/80 text-foreground font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Launch Mail App</span>
              </button>

              <button
                type="button"
                onClick={handleCopyEmail}
                className="py-2.5 px-3 rounded-xl border border-border/80 bg-surface hover:bg-surface/80 text-foreground font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                title="Copy Email"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedEmail ? "Copied" : "Copy Email"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-border/80 bg-surface hover:bg-surface/80 text-foreground font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Footer with testing sandbox */}
          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono flex-shrink-0">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{SUPPORT_EMAIL}</span>
            </div>
            <button
              type="button"
              onClick={handleInstantSandboxUnlock}
              disabled={isActivatingSandbox}
              className="text-muted-foreground/60 hover:text-primary transition-colors underline cursor-pointer"
            >
              {isActivatingSandbox ? "Activating..." : "Test Sandbox Unlock"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

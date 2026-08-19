import React, { useState } from "react";
import { Masterclass } from "@/hooks/use-classes";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  QrCode,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  Shield,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface ClassBookingModalProps {
  masterclass: Masterclass | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmBooking: (classId: string, paymentMethod: string) => Promise<{ success: boolean; error?: string }>;
}

export const ClassBookingModal: React.FC<ClassBookingModalProps> = ({
  masterclass,
  isOpen,
  onClose,
  onConfirmBooking,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Card" | "NetBanking">("UPI");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !masterclass) return null;

  const handlePay = async () => {
    setLoading(true);
    const res = await onConfirmBooking(masterclass.id, paymentMethod);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      toast.error(res.error || "Booking failed");
    }
  };

  const formattedDate = new Date(masterclass.scheduledAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden border border-border/80 rounded-3xl bg-card/95 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/50 bg-gradient-to-r from-amber-500/10 via-card to-primary/10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-xl shadow-xs">
                🎓
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground font-mono">
                  Enroll in Masterclass
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  PPS Focus Rooms Ticket & Live Seat Confirmation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Class Title & Mentor info */}
            <div className="p-4 rounded-2xl bg-surface/70 border border-border/70 space-y-2">
              <div className="text-sm font-extrabold text-foreground leading-snug">
                {masterclass.title}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{masterclass.mentorAvatar}</span>
                <span className="font-bold text-foreground">{masterclass.mentorName}</span>
                <span>•</span>
                <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                  {masterclass.mentorBadge === "master" ? "👑 Master Teacher" : "🌟 Verified Mentor"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" />
                  <span>{formattedDate}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" />
                  <span>{masterclass.durationMinutes} mins</span>
                </span>
              </div>
            </div>

            {/* Price & Breakdown */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
                  Ticket Fee (Includes Notes & Replay)
                </div>
                <div className="text-2xl font-black font-mono text-foreground mt-0.5">
                  {masterclass.price === 0 ? "FREE" : `₹${masterclass.price}`}
                </div>
              </div>
              <div className="text-right text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>100% Money-Back Guarantee</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            {masterclass.price > 0 && (
              <div className="space-y-2">
                <label className="block text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "UPI" as const, label: "UPI / GPay / Paytm", icon: <QrCode className="w-3.5 h-3.5" /> },
                    { id: "Card" as const, label: "Debit / Credit Card", icon: <CreditCard className="w-3.5 h-3.5" /> },
                    { id: "NetBanking" as const, label: "NetBanking", icon: <Shield className="w-3.5 h-3.5" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-14 ${
                        paymentMethod === m.id
                          ? "bg-primary/15 border-primary text-foreground font-bold"
                          : "bg-surface border-border/70 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="text-primary">{m.icon}</span>
                      <span className="text-[10px] truncate leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation CTA */}
            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-primary via-secondary to-accent text-white text-xs font-black rounded-xl hover:opacity-95 transition-all shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? "Processing..." : masterclass.price === 0 ? "Confirm Free Enrollment" : `Pay ₹${masterclass.price} & Reserve Seat`}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

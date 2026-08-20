import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, CheckCircle2, Send, X, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CampusDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStudents?: number;
}

export const CampusDemoModal: React.FC<CampusDemoModalProps> = ({
  isOpen,
  onClose,
  defaultStudents = 150,
}) => {
  const [instituteName, setInstituteName] = useState("");
  const [contactName, setContactName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [studentCount, setStudentCount] = useState(defaultStudents);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instituteName.trim() || !contactName.trim() || !workEmail.trim()) {
      toast.error("Please fill in your Institute Name, Contact Name, and Work Email.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Enterprise Campus Proposal Request Submitted! 🎓", {
        description: "Our Academic Institutional Director will contact you within 12 business hours.",
      });
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg rounded-3xl bg-card border border-secondary/40 shadow-2xl p-6 sm:p-8 overflow-hidden text-foreground backdrop-blur-2xl"
        >
          {/* Top 3D Aura */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-surface border border-border/80 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-secondary bg-secondary/15 px-3 py-1 rounded-full border border-secondary/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>Campus & Institutional Licensing</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-mono">
              Request Academic PO & Proposal
            </h2>
            <p className="text-xs text-muted-foreground">
              Empower your students and faculty with flat semester licensing, attendance audit logs, and custom batch leaderboards.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">Institution / College Name *</label>
                <input
                  type="text"
                  required
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  placeholder="e.g. Stanford / IIT Madras / Allen Academy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface/80 border border-border/80 text-foreground outline-none focus:border-secondary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Dean / Academic Director Name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface/80 border border-border/80 text-foreground outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">Work / Official Email *</label>
                <input
                  type="email"
                  required
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="dean@university.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface/80 border border-border/80 text-foreground outline-none focus:border-secondary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface/80 border border-border/80 text-foreground outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground">Estimated Student Batch Size</label>
              <input
                type="number"
                min="20"
                max="5000"
                value={studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface/80 border border-border/80 text-foreground outline-none focus:border-secondary transition-all font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground">Special Customization Requirements (Optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific LMS integration, custom white-label domain, or faculty training requirements..."
                className="w-full px-3.5 py-2 rounded-xl bg-surface/80 border border-border/80 text-foreground outline-none focus:border-secondary transition-all resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-secondary via-cyan-500 to-primary text-black font-black text-xs hover:opacity-95 transition-all shadow-xl shadow-secondary/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting Proposal Request...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Proposal Request (Free 14-Day Pilot)</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2 border-t border-border/40 space-y-1">
              <p className="text-[11px] text-muted-foreground">
                Direct Enterprise & Campus Negotiation:{" "}
                <a
                  href="mailto:enterprise@upalakshya.com?subject=PPS%20Campus%20Institutional%20License%20Negotiation&body=Hello%20UpaLakshya%20PPS%20Enterprise%20Team%2C%0A%0AWe%20would%20like%20to%20negotiate%20and%20deploy%20the%20Campus%20Institutional%20License%20for%20our%20organization.%0A%0AInstitution%20Name%3A%0AEstimated%20Students%2FFaculty%20Seats%3A%0AContact%20Person%3A%0APreferred%20Timeline%3A%0A%0AThank%20you!"
                  className="font-mono font-bold text-primary hover:underline"
                >
                  enterprise@upalakshya.com
                </a>
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-mono">
                <Shield className="w-3 h-3 text-secondary" />
                <span>FERPA & GDPR Compliant • Institutional SLA Guaranteed</span>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

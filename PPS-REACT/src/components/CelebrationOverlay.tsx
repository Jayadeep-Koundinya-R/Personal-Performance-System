/*
  💡 REACT LESSON: Celebration Overlay
  Shows a full-screen animation when you level up or unlock a badge.
  Uses framer-motion for smooth entrance/exit and confetti-like particles.
*/

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface CelebrationOverlayProps {
  show: boolean;
  onClose: () => void;
  type: "levelup" | "badge";
  title: string;
  subtitle: string;
  icon: string;
}

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.5,
  size: Math.random() * 8 + 4,
  color: ["#6366f1", "#06b6d4", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6"][Math.floor(Math.random() * 6)],
}));

const CelebrationOverlay = ({ show, onClose, type, title, subtitle, icon }: CelebrationOverlayProps) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

          {/* Particles */}
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
              }}
              initial={{ top: "50%", opacity: 1, scale: 0 }}
              animate={{
                top: `${Math.random() * 30 + 10}%`,
                opacity: [0, 1, 1, 0],
                scale: [0, 1.5, 1, 0],
                x: (Math.random() - 0.5) * 200,
              }}
              transition={{ duration: 2, delay: p.delay, ease: "easeOut" }}
            />
          ))}

          {/* Main card */}
          <motion.div
            className="relative bg-card border border-border rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl"
            initial={{ scale: 0.5, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
          >
            <motion.div
              className="text-6xl mb-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2, damping: 10 }}
            >
              {icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-[11px] uppercase tracking-wider text-primary font-semibold font-mono mb-1">
                {type === "levelup" ? "🎉 Level Up!" : "🏅 Badge Unlocked!"}
              </div>
              <h2 className="text-xl font-bold mb-1">{title}</h2>
              <p className="text-[13px] text-muted-foreground">{subtitle}</p>
            </motion.div>

            <motion.button
              className="mt-5 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-[13px] font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Awesome!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CelebrationOverlay;

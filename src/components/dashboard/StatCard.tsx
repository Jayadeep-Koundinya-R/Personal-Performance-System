import { motion } from "framer-motion";
import * as React from "react";

interface StatCardProps {
  value: string;
  label: string;
  icon: string;
  trend: React.ReactNode;
  progress: number;
  variant: "indigo" | "orange" | "cyan" | "green";
}

export function StatCard({ value, label, icon, trend, progress, variant }: StatCardProps) {
  const variantMap = {
    indigo: { from: "var(--stat-indigo-from)", to: "var(--stat-indigo-to)", border: "var(--stat-indigo-border)", bar: "hsl(var(--primary))" },
    orange: { from: "var(--stat-orange-from)", to: "var(--stat-orange-to)", border: "var(--stat-orange-border)", bar: "hsl(var(--orange))" },
    cyan:   { from: "var(--stat-cyan-from)",   to: "var(--stat-cyan-to)",   border: "var(--stat-cyan-border)",   bar: "hsl(var(--secondary))" },
    green:  { from: "var(--stat-green-from)",  to: "var(--stat-green-to)",  border: "var(--stat-green-border)",  bar: "hsl(var(--green))" },
  };
  const v = variantMap[variant];

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="rounded-xl p-[18px] px-5 relative overflow-hidden cursor-default"
      style={{
        background: `linear-gradient(135deg, hsl(${v.from}), hsl(${v.to}))`,
        borderWidth: "1px",
        borderColor: `hsl(${v.border} / 0.5)`,
        boxShadow: "var(--stat-shadow)",
      }}
    >
      <div className="flex items-center justify-between">
        <motion.div
          key={value}
          initial={{ scale: 1.15, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="text-[28px] font-bold font-mono"
        >
          {value}
        </motion.div>
        <motion.div
          whileHover={{ rotate: 15, scale: 1.15 }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: `hsl(${v.border} / 0.3)` }}
        >
          {icon}
        </motion.div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {trend}
      <div className="rounded-full h-1 mt-2" style={{ background: `hsl(${v.border} / 0.3)` }}>
        <motion.div
          className="h-1 rounded-full"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ background: v.bar }}
        />
      </div>
    </motion.div>
  );
}

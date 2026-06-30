import { motion } from "framer-motion";

interface InsightCardProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

export function InsightCard({ icon, label, value, color }: InsightCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 cursor-default"
    >
      <motion.div
        whileHover={{ rotate: 10 }}
        className={`w-9 h-9 rounded-lg bg-${color}/15 flex items-center justify-center text-base`}
      >
        {icon}
      </motion.div>
      <div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </motion.div>
  );
}

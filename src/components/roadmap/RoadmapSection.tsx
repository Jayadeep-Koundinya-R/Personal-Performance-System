import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROADMAP_DATA, RoadmapMilestone } from "@/lib/roadmap-data";
import {
  Sparkles,
  Zap,
  Shield,
  Video,
  Lock,
  Cpu,
  Globe,
  GraduationCap,
  Smartphone,
  Layers,
  HeartPulse,
  Brain,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
} from "lucide-react";

export const RoadmapSection: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "in_progress" | "next_up" | "future_vision">("all");

  const filteredItems = ROADMAP_DATA.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  return (
    <section id="roadmap" className="relative z-10 max-w-7xl mx-auto px-6 py-16 space-y-10">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold text-cyan-400 bg-cyan-500/15 px-3.5 py-1.5 rounded-full border border-cyan-500/30 uppercase shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Product & Engineering Roadmap</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-foreground">
          Future Innovations & Milestones
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Explore our transparent engineering pipeline spanning secure WebRTC communications, verified mentor economics, deep AI habit extraction, and university LMS integrations.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {[
          { id: "all", label: "All Milestones (4 Quarters)" },
          { id: "in_progress", label: "⚡ In Active Delivery" },
          { id: "next_up", label: "🚀 Scheduled Next" },
          { id: "future_vision", label: "🔮 Future Vision" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer border shadow-xs ${
              filter === tab.id
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card/70 text-muted-foreground border-border/80 hover:text-foreground hover:bg-card"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Milestone Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={`p-6 sm:p-8 rounded-3xl bg-card/85 backdrop-blur-xl border shadow-xl flex flex-col justify-between space-y-6 hover:scale-[1.01] transition-all duration-300 group ${
              m.status === "in_progress"
                ? "border-primary/40 hover:border-primary shadow-primary/5"
                : m.status === "next_up"
                ? "border-amber-500/40 hover:border-amber-500 shadow-amber-500/5"
                : "border-secondary/40 hover:border-secondary shadow-secondary/5"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2.5 rounded-2xl bg-surface border border-border/80 group-hover:scale-110 transition-transform">
                    {m.icon}
                  </span>
                  <div>
                    <span className="text-xs font-mono font-black text-foreground block">{m.quarter}</span>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{m.category}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-black px-3 py-1 rounded-full border uppercase ${
                    m.status === "in_progress"
                      ? "text-primary bg-primary/15 border-primary/30"
                      : m.status === "next_up"
                      ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
                      : "text-secondary bg-secondary/15 border-secondary/30"
                  }`}
                >
                  {m.statusLabel}
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black font-mono text-foreground leading-snug">
                  {m.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
                  {m.description}
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Key Capabilities:</div>
                <ul className="space-y-1.5 text-xs text-foreground/90">
                  {m.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-[11.5px] leading-relaxed font-medium">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tech Stack Pills */}
            <div className="pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground mr-1">Architecture:</span>
              {m.techStack.map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] font-mono font-bold bg-surface px-2.5 py-0.5 rounded-lg border border-border/80 text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

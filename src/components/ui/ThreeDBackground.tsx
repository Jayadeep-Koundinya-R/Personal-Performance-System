import React from "react";
import { useTheme } from "@/hooks/use-theme";

export const ThreeDBackground: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-500">
      {/* ── Base Layer ── */}
      {isDark ? (
        <div className="absolute inset-0 bg-[#090b12]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]" />
      )}

      {/* ── 3D Glowing Ambient Orbs (GPU Accelerated & Smooth) ── */}
      
      {/* Orb 1: Top-Left Ambient (Indigo / Sky Blue) */}
      <div
        className={`absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[80px] pointer-events-none transition-all duration-700 animate-pulse ${
          isDark
            ? "bg-primary/25 opacity-70"
            : "bg-sky-400/25 opacity-80"
        }`}
        style={{ willChange: "transform, opacity" }}
      />

      {/* Orb 2: Mid-Right Ambient (Cyan / Soft Violet) */}
      <div
        className={`absolute top-1/3 -right-24 w-96 h-96 rounded-full blur-[80px] pointer-events-none transition-all duration-700 ${
          isDark
            ? "bg-cyan-500/20 opacity-60"
            : "bg-indigo-300/30 opacity-75"
        }`}
        style={{ willChange: "transform, opacity" }}
      />

      {/* Orb 3: Bottom Ambient (Purple / Warm Amber) */}
      <div
        className={`absolute -bottom-32 left-1/4 w-[420px] h-[420px] rounded-full blur-[90px] pointer-events-none transition-all duration-700 ${
          isDark
            ? "bg-purple-600/20 opacity-65"
            : "bg-amber-300/25 opacity-70"
        }`}
        style={{ willChange: "transform, opacity" }}
      />

      {/* ── 3D Floating Isometric Geometric Objects ── */}

      {/* 3D Object 1: Floating Glowing Cube (Top Right) */}
      <div
        className="absolute top-20 right-[10%] hidden md:block opacity-40 hover:opacity-75 transition-opacity"
        style={{ perspective: 1000 }}
      >
        <div
          className={`w-20 h-20 rounded-2xl border-2 transform rotate-12 backdrop-blur-sm transition-all duration-700 ${
            isDark
              ? "border-primary/40 bg-gradient-to-br from-primary/20 to-transparent shadow-[0_0_25px_rgba(99,102,241,0.25)]"
              : "border-indigo-400/40 bg-gradient-to-br from-white/80 via-indigo-100/40 to-transparent shadow-[0_8px_20px_rgba(99,102,241,0.12)]"
          }`}
        />
      </div>

      {/* 3D Object 2: Floating Torus Ring (Left Middle) */}
      <div className="absolute top-1/2 left-[4%] hidden lg:block opacity-35">
        <div
          className={`w-24 h-24 rounded-full border-4 border-dashed backdrop-blur-xs transition-all duration-700 ${
            isDark
              ? "border-cyan-400/30 bg-gradient-to-tr from-cyan-500/10 to-transparent shadow-[0_0_30px_rgba(6,182,212,0.2)]"
              : "border-sky-400/40 bg-gradient-to-tr from-sky-200/40 to-transparent shadow-[0_8px_25px_rgba(56,189,248,0.12)]"
          }`}
        />
      </div>

      {/* 3D Object 3: Floating Pyramidal Diamond (Bottom Right) */}
      <div className="absolute bottom-28 right-[6%] hidden md:block opacity-35">
        <div
          className={`w-16 h-16 border-2 transform rotate-45 rounded-xl backdrop-blur-sm transition-all duration-700 ${
            isDark
              ? "border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-transparent to-primary/10 shadow-[0_0_25px_rgba(251,191,36,0.2)]"
              : "border-amber-400/50 bg-gradient-to-br from-amber-100/60 via-white/60 to-primary/10 shadow-[0_8px_20px_rgba(245,158,11,0.12)]"
          }`}
        />
      </div>

      {/* ── Micro Grid Dots Background Pattern ── */}
      {isDark ? (
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.035]" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06]" />
      )}
    </div>
  );
};

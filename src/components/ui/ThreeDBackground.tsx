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
            ? "bg-primary/35 opacity-80"
            : "bg-sky-400/35 opacity-90"
        }`}
        style={{ willChange: "transform, opacity" }}
      />

      {/* Orb 2: Mid-Right Ambient (Cyan / Soft Violet) */}
      <div
        className={`absolute top-1/3 -right-24 w-96 h-96 rounded-full blur-[80px] pointer-events-none transition-all duration-700 ${
          isDark
            ? "bg-cyan-500/30 opacity-75"
            : "bg-indigo-300/45 opacity-85"
        }`}
        style={{ willChange: "transform, opacity" }}
      />

      {/* Orb 3: Bottom Ambient (Purple / Warm Amber) */}
      <div
        className={`absolute -bottom-32 left-1/4 w-[420px] h-[420px] rounded-full blur-[90px] pointer-events-none transition-all duration-700 ${
          isDark
            ? "bg-purple-600/30 opacity-80"
            : "bg-amber-300/35 opacity-80"
        }`}
        style={{ willChange: "transform, opacity" }}
      />

      {/* ── 3D Floating Isometric Geometric Objects ── */}

      {/* 3D Object 1: Floating Glowing Cube (Top Right) */}
      <div
        className="absolute top-20 right-[12%] hidden md:block opacity-75 hover:opacity-100 transition-all duration-500 animate-bounce"
        style={{ perspective: 1000, animationDuration: "7s" }}
      >
        <div
          className={`w-20 h-20 rounded-2xl border-2 transform rotate-12 backdrop-blur-md transition-all duration-700 ${
            isDark
              ? "border-primary/60 bg-gradient-to-br from-primary/30 to-transparent shadow-[0_0_35px_rgba(99,102,241,0.4)]"
              : "border-indigo-500/50 bg-gradient-to-br from-white/90 via-indigo-100/60 to-transparent shadow-[0_8px_25px_rgba(99,102,241,0.2)]"
          }`}
        />
      </div>

      {/* 3D Object 2: Floating Torus Ring (Left Middle) */}
      <div 
        className="absolute top-1/2 left-[5%] hidden lg:block opacity-70 hover:opacity-100 transition-all duration-500 animate-pulse"
        style={{ animationDuration: "5s" }}
      >
        <div
          className={`w-24 h-24 rounded-full border-4 border-dashed backdrop-blur-sm transition-all duration-700 ${
            isDark
              ? "border-cyan-400/50 bg-gradient-to-tr from-cyan-500/25 to-transparent shadow-[0_0_35px_rgba(6,182,212,0.35)]"
              : "border-sky-500/50 bg-gradient-to-tr from-sky-200/60 to-transparent shadow-[0_8px_25px_rgba(56,189,248,0.2)]"
          }`}
        />
      </div>

      {/* 3D Object 3: Floating Pyramidal Diamond (Bottom Right) */}
      <div 
        className="absolute bottom-28 right-[8%] hidden md:block opacity-70 hover:opacity-100 transition-all duration-500 animate-bounce"
        style={{ animationDuration: "9s" }}
      >
        <div
          className={`w-16 h-16 border-2 transform rotate-45 rounded-xl backdrop-blur-md transition-all duration-700 ${
            isDark
              ? "border-amber-400/60 bg-gradient-to-br from-amber-500/25 via-transparent to-primary/20 shadow-[0_0_35px_rgba(251,191,36,0.35)]"
              : "border-amber-500/60 bg-gradient-to-br from-amber-100/80 via-white/80 to-primary/20 shadow-[0_8px_25px_rgba(245,158,11,0.2)]"
          }`}
        />
      </div>

      {/* ── Micro Grid Dots Background Pattern ── */}
      {isDark ? (
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.06]" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.08]" />
      )}
    </div>
  );
};

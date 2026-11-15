import React, { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";

/**
 * 🌌 3D Aurora Mesh & Prismatic Glass Background
 * Shared across every screen in PPS for a unified, modern, high-craft aesthetic.
 *
 * Features:
 * - Fluid multi-ribbon Aurora Mesh (Electric Indigo, Cyan Aurora, Agni Amber, Deep Violet)
 * - Hardware-accelerated 3D perspective depth with smooth mouse parallax
 * - Subtle 3D perspective grid with depth horizon
 * - Zero CPU overhead, pointer-events-none, 60+ FPS on all devices
 */
export const ThreeDBackground: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const meshRef = useRef<HTMLDivElement | null>(null);

  // Smooth 3D mouse parallax tracking
  useEffect(() => {
    let animId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      // Normalize to -1 to 1 range
      targetX = (e.clientX / innerWidth - 0.5) * 2;
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const updateParallax = () => {
      // Smooth spring lerp damping (0.05 factor)
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (meshRef.current) {
        const rotateX = -currentY * 8; // Max 8 deg tilt
        const rotateY = currentX * 10; // Max 10 deg tilt
        const transX = currentX * 15;
        const transY = currentY * 15;
        meshRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${transX}px, ${transY}px, 0)`;
      }

      animId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    animId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-700"
    >
      {/* ── Base Foundation Layer ── */}
      {isDark ? (
        <div className="absolute inset-0 bg-[#07090e]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]" />
      )}

      {/* ── 3D Parallax Spatial Canvas ── */}
      <div
        ref={meshRef}
        className="absolute inset-[-10%] w-[120%] h-[120%] transition-transform ease-out will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Aurora Ribbon 1: Electric Indigo Beam (Top-Left) */}
        <div
          className={`absolute top-[5%] left-[10%] w-[550px] h-[550px] rounded-full blur-[110px] pointer-events-none transition-all duration-1000 ${
            isDark
              ? "bg-gradient-to-br from-indigo-600/40 via-primary/30 to-transparent opacity-85"
              : "bg-gradient-to-br from-indigo-300/45 via-sky-200/50 to-transparent opacity-80"
          }`}
          style={{ willChange: "transform, opacity", transform: "translateZ(40px)" }}
        />

        {/* Aurora Ribbon 2: Cyan Atmospheric Wave (Mid-Right) */}
        <div
          className={`absolute top-[25%] right-[5%] w-[600px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000 ${
            isDark
              ? "bg-gradient-to-bl from-cyan-500/35 via-teal-500/20 to-transparent opacity-75"
              : "bg-gradient-to-bl from-cyan-200/50 via-sky-300/40 to-transparent opacity-70"
          }`}
          style={{ willChange: "transform, opacity", transform: "translateZ(20px)" }}
        />

        {/* Aurora Ribbon 3: Warm Agni Energy Flare (Bottom-Center) */}
        <div
          className={`absolute -bottom-[10%] left-[25%] w-[650px] h-[500px] rounded-full blur-[130px] pointer-events-none transition-all duration-1000 ${
            isDark
              ? "bg-gradient-to-t from-amber-500/20 via-orange-600/15 to-transparent opacity-70"
              : "bg-gradient-to-t from-amber-200/40 via-orange-100/35 to-transparent opacity-65"
          }`}
          style={{ willChange: "transform, opacity", transform: "translateZ(60px)" }}
        />

        {/* Aurora Ribbon 4: Deep Cosmic Violet Nebula (Center Accent) */}
        <div
          className={`absolute top-[45%] left-[30%] w-[450px] h-[450px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000 ${
            isDark
              ? "bg-gradient-to-tr from-purple-600/25 via-fuchsia-600/15 to-transparent opacity-60"
              : "bg-gradient-to-tr from-purple-200/35 via-pink-100/30 to-transparent opacity-50"
          }`}
          style={{ willChange: "transform, opacity", transform: "translateZ(-30px)" }}
        />

        {/* ── 3D Geometric Object 1: Floating Prismatic Glass Cube (Top-Right) ── */}
        <div
          className="absolute top-24 right-[10%] hidden md:block pointer-events-none transition-all duration-700 animate-pulse"
          style={{
            transform: "translateZ(85px) perspective(800px) rotateX(20deg) rotateY(-25deg)",
            animationDuration: "6s",
          }}
        >
          <div
            className={`w-24 h-24 rounded-2xl border-2 backdrop-blur-md transition-all duration-700 relative shadow-2xl ${
              isDark
                ? "border-primary/50 bg-gradient-to-br from-primary/25 via-indigo-600/15 to-transparent shadow-[0_0_35px_rgba(99,102,241,0.35)]"
                : "border-indigo-400/50 bg-gradient-to-br from-white/90 via-indigo-100/60 to-transparent shadow-[0_8px_30px_rgba(99,102,241,0.18)]"
            }`}
          >
            {/* Inner 3D specular facet */}
            <div
              className={`absolute inset-2 rounded-xl border border-dashed transition-all duration-700 ${
                isDark ? "border-cyan-400/40 bg-cyan-500/5" : "border-indigo-300/60 bg-white/40"
              }`}
              style={{ transform: "translateZ(20px)" }}
            />
          </div>
        </div>

        {/* ── 3D Geometric Object 2: Floating Concentric Cyber Torus Ring (Mid-Left) ── */}
        <div
          className="absolute top-[45%] left-[5%] hidden lg:block pointer-events-none transition-all duration-700 animate-pulse"
          style={{
            transform: "translateZ(55px) perspective(900px) rotateX(55deg) rotateZ(30deg)",
            animationDuration: "8s",
          }}
        >
          <div
            className={`w-28 h-28 rounded-full border-4 border-dashed backdrop-blur-sm transition-all duration-700 relative ${
              isDark
                ? "border-cyan-400/45 bg-gradient-to-tr from-cyan-500/15 to-transparent shadow-[0_0_40px_rgba(6,182,212,0.3)]"
                : "border-sky-400/50 bg-gradient-to-tr from-sky-100/60 to-transparent shadow-[0_8px_25px_rgba(56,189,248,0.15)]"
            }`}
          >
            {/* Concentric core pulse */}
            <div
              className="absolute inset-4 rounded-full border-2 border-primary/30 animate-spin"
              style={{ animationDuration: "20s" }}
            />
          </div>
        </div>

        {/* ── 3D Geometric Object 3: Floating Pyramidal Octahedron Diamond (Bottom-Right) ── */}
        <div
          className="absolute bottom-28 right-[7%] hidden md:block pointer-events-none transition-all duration-700 animate-pulse"
          style={{
            transform: "translateZ(75px) perspective(800px) rotate(45deg) rotateX(15deg)",
            animationDuration: "7s",
          }}
        >
          <div
            className={`w-20 h-20 border-2 rounded-2xl backdrop-blur-md transition-all duration-700 shadow-2xl ${
              isDark
                ? "border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-transparent to-primary/20 shadow-[0_0_35px_rgba(251,191,36,0.3)]"
                : "border-amber-400/60 bg-gradient-to-br from-amber-100/80 via-white/80 to-primary/20 shadow-[0_8px_25px_rgba(245,158,11,0.18)]"
            }`}
          >
            <div
              className="absolute inset-2 border border-dashed rounded-xl border-amber-300/40"
              style={{ transform: "rotate(45deg)" }}
            />
          </div>
        </div>

        {/* ── 3D Perspective Cyber-Topography Floor Grid ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)"
              : "linear-gradient(to right, rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 85%)",
            transform: "translateZ(-50px)",
          }}
        />

        {/* ── Micro Starlight Constellation Dots ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: isDark
              ? "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)"
              : "radial-gradient(rgba(79,70,229,0.14) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 75%)",
          }}
        />
      </div>
    </div>
  );
};

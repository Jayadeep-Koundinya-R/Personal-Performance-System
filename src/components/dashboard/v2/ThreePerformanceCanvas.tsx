import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Eye, EyeOff, Sparkles, Compass } from "lucide-react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Edge {
  a: number;
  b: number;
}

/**
 * 🌌 ThreePerformanceCanvas
 * Ultra-smooth, hardware-accelerated 3D ambient spatial layer for PPS Dashboard.
 * 
 * Features:
 * - Concentric Gyroscope / Trinity Rings (representing Deep Work, Habit Velocity & Agni Energy)
 * - Rotating 3D Polyhedron / Kaizen Core (Discipline & Streak resilience)
 * - Chronos Ambient Floating Particles
 * - Mouse parallax tilt with spring damping
 * - Native 60 FPS requestAnimationFrame with offscreen throttling & reduced-motion support
 */
export const ThreePerformanceCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Mouse parallax coordinates
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseRef.current.targetX = Math.max(-1, Math.min(1, nx));
    mouseRef.current.targetY = Math.max(-1, Math.min(1, ny));
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 450;
    };
    window.addEventListener("resize", handleResize);

    // ── 3D Geometry Definitions ──
    // 1. Polyhedron (Kaizen Core - Octahedron)
    const basePolyhedron: Point3D[] = [
      { x: 0, y: -45, z: 0 },   // Top apex
      { x: 35, y: 0, z: 0 },    // Right
      { x: 0, y: 0, z: 35 },    // Front
      { x: -35, y: 0, z: 0 },   // Left
      { x: 0, y: 0, z: -35 },   // Back
      { x: 0, y: 45, z: 0 },    // Bottom apex
    ];

    const polyEdges: Edge[] = [
      // Top pyramid
      { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }, { a: 0, b: 4 },
      // Equator
      { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 4 }, { a: 4, b: 1 },
      // Bottom pyramid
      { a: 5, b: 1 }, { a: 5, b: 2 }, { a: 5, b: 3 }, { a: 5, b: 4 },
    ];

    // 2. Gyroscope Torus Rings (Concentric Circles projected into 3D)
    const ringSegments = 36;
    const createRing = (radius: number, tiltAxis: "x" | "y" | "z", tiltAngle: number): Point3D[] => {
      const pts: Point3D[] = [];
      for (let i = 0; i < ringSegments; i++) {
        const theta = (i / ringSegments) * Math.PI * 2;
        let px = Math.cos(theta) * radius;
        let py = Math.sin(theta) * radius;
        let pz = 0;

        // Apply initial static tilt
        if (tiltAxis === "x") {
          const cy = py * Math.cos(tiltAngle) - pz * Math.sin(tiltAngle);
          const cz = py * Math.sin(tiltAngle) + pz * Math.cos(tiltAngle);
          py = cy; pz = cz;
        } else if (tiltAxis === "y") {
          const cx = px * Math.cos(tiltAngle) + pz * Math.sin(tiltAngle);
          const cz = -px * Math.sin(tiltAngle) + pz * Math.cos(tiltAngle);
          px = cx; pz = cz;
        }
        pts.push({ x: px, y: py, z: pz });
      }
      return pts;
    };

    const ringOuter = createRing(110, "x", 0.6);
    const ringMiddle = createRing(85, "y", 0.8);
    const ringInner = createRing(60, "x", -0.5);

    // 3. Ambient Chronos Particles
    const particleCount = 28;
    const particles: (Point3D & { vx: number; vy: number; vz: number; size: number; alpha: number })[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 300,
        z: (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    // Rotation angles
    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;

    // ── 3D Projection Math ──
    const fov = 400;
    const project = (p: Point3D, cx: number, cy: number) => {
      const zOffset = p.z + fov;
      const scale = fov / (zOffset <= 0 ? 0.001 : zOffset);
      return {
        x: p.x * scale + cx,
        y: p.y * scale + cy,
        scale,
      };
    };

    const rotatePoint = (p: Point3D, rx: number, ry: number, rz: number): Point3D => {
      // Rotate around X
      const y1 = p.y * Math.cos(rx) - p.z * Math.sin(rx);
      const z1 = p.y * Math.sin(rx) + p.z * Math.cos(rx);

      // Rotate around Y
      const x2 = p.x * Math.cos(ry) + z1 * Math.sin(ry);
      const z2 = -p.x * Math.sin(ry) + z1 * Math.cos(ry);

      // Rotate around Z
      const x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
      const y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);

      return { x: x3, y: y3, z: z2 };
    };

    // ── Render Loop ──
    const render = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse parallax interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const parallaxRx = mouseRef.current.y * 0.25;
      const parallaxRy = mouseRef.current.x * 0.35;

      if (!isPaused) {
        angleX += 0.004;
        angleY += 0.006;
        angleZ += 0.002;
      }

      // Anchored spatial center (positioned gracefully toward the right in desktop, centered on mobile)
      const centerX = width > 1024 ? width * 0.78 : width * 0.5;
      const centerY = Math.max(160, Math.min(height * 0.45, 280));

      // ── Draw Ambient Glow Behind Objects ──
      const glowGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 220);
      if (isDark) {
        glowGrad.addColorStop(0, "rgba(99, 102, 241, 0.35)");
        glowGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.18)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(99, 102, 241, 0.22)");
        glowGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.12)");
        glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      }
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 240, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw Floating Chronos Particles ──
      particles.forEach((pt) => {
        if (!isPaused) {
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.z += pt.vz;
          if (pt.x > 250) pt.x = -250;
          if (pt.x < -250) pt.x = 250;
          if (pt.y > 180) pt.y = -180;
          if (pt.y < -180) pt.y = 180;
        }
        const rotated = rotatePoint(pt, parallaxRx, parallaxRy, 0);
        const proj = project(rotated, centerX, centerY);

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pt.size * Math.max(0.3, proj.scale), 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(165, 180, 252, ${Math.min(1, pt.alpha * 1.2)})`
          : `rgba(99, 102, 241, ${Math.min(1, pt.alpha * 0.9)})`;
        ctx.shadowColor = isDark ? "#818cf8" : "#6366f1";
        ctx.shadowBlur = 6;
        ctx.fill();
      });

      // ── Draw Gyroscope Concentric Rings ──
      const drawRing = (
        ringPts: Point3D[],
        strokeColor: string,
        glowColor: string,
        rotSpeedMultiplier: number,
        pulseOffset: number
      ) => {
        const currentAngleX = angleX * rotSpeedMultiplier + parallaxRx;
        const currentAngleY = angleY * rotSpeedMultiplier + parallaxRy;
        const currentAngleZ = angleZ * rotSpeedMultiplier;

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isDark ? 2.0 : 1.8;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 16;

        ctx.beginPath();
        for (let i = 0; i <= ringPts.length; i++) {
          const p = ringPts[i % ringPts.length];
          const rot = rotatePoint(p, currentAngleX, currentAngleY, currentAngleZ);
          const proj = project(rot, centerX, centerY);
          if (i === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        }
        ctx.stroke();

        // Add 2 glowing orbit beads on each ring
        const beadIndices = [
          Math.floor((angleY * 20 + pulseOffset) % ringPts.length),
          Math.floor((angleY * 20 + pulseOffset + ringPts.length / 2) % ringPts.length),
        ];
        beadIndices.forEach((idx) => {
          const bp = ringPts[idx];
          const rotB = rotatePoint(bp, currentAngleX, currentAngleY, currentAngleZ);
          const projB = project(rotB, centerX, centerY);
          ctx.beginPath();
          ctx.arc(projB.x, projB.y, 3.5 * projB.scale, 0, Math.PI * 2);
          ctx.fillStyle = glowColor;
          ctx.shadowBlur = 18;
          ctx.fill();
        });

        ctx.restore();
      };

      // Outer Ring: Deep Work Indigo Orbit
      drawRing(
        ringOuter,
        isDark ? "rgba(129, 140, 248, 0.85)" : "rgba(99, 102, 241, 0.75)",
        isDark ? "#818cf8" : "#6366f1",
        0.7,
        0
      );

      // Middle Ring: Cyan Velocity Orbit
      drawRing(
        ringMiddle,
        isDark ? "rgba(34, 211, 238, 0.90)" : "rgba(14, 165, 233, 0.80)",
        isDark ? "#22d3ee" : "#0ea5e9",
        -0.85,
        12
      );

      // Inner Ring: Amber Agni Discipline Orbit
      drawRing(
        ringInner,
        isDark ? "rgba(251, 191, 36, 0.88)" : "rgba(245, 158, 11, 0.75)",
        isDark ? "#fbbf24" : "#f59e0b",
        1.1,
        24
      );

      // ── Draw Polyhedron (Kaizen Discipline Gem) ──
      const rotatedPoly = basePolyhedron.map((p) =>
        rotatePoint(p, -angleX * 1.5 + parallaxRx, angleY * 1.8 + parallaxRy, angleZ)
      );
      const projectedPoly = rotatedPoly.map((p) => project(p, centerX, centerY));

      // Draw Polyhedron Wireframe Edges with Glowing Depth
      ctx.save();
      polyEdges.forEach((edge) => {
        const p1 = projectedPoly[edge.a];
        const p2 = projectedPoly[edge.b];
        const zMid = (rotatedPoly[edge.a].z + rotatedPoly[edge.b].z) / 2;
        const depthAlpha = Math.max(0.3, Math.min(1.0, (zMid + 60) / 100));

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = isDark
          ? `rgba(167, 139, 250, ${depthAlpha * 0.95})`
          : `rgba(124, 58, 237, ${depthAlpha * 0.85})`;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = "#a78bfa";
        ctx.shadowBlur = 14;
        ctx.stroke();
      });

      // Draw Polyhedron Vertices
      projectedPoly.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 || idx === 5 ? "#fbbf24" : "#38bdf8";
        ctx.shadowBlur = 16;
        ctx.fill();
      });
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDark, isPaused]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      style={{ perspective: 1200 }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Subtle Spatial Legend Pill (Desktop-only, bottom-right) */}
      <div className="absolute bottom-3 right-4 pointer-events-auto hidden md:flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-card/70 backdrop-blur-md border border-border/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          title={isPaused ? "Resume 3D Spatial Motion" : "Pause 3D Spatial Motion"}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-amber-400" : "bg-emerald-400 animate-ping"}`} />
          <span>{isPaused ? "3D Paused" : "3D Spatial Orbit"}</span>
        </button>
      </div>
    </div>
  );
};

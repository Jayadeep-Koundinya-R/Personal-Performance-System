import React from "react";
import logoImg from "@/assets/logo.png";
import logoRoundImg from "@/assets/logo-round.png";

export interface BrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "square" | "round";
  showText?: boolean;
  tagline?: string;
  badge?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  animated?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  variant = "square",
  showText = true,
  tagline,
  badge,
  className = "",
  iconClassName = "",
  textClassName = "",
  animated = true,
}) => {
  const sizeMap = {
    xs: { icon: "w-5 h-5", text: "text-sm", container: "gap-1.5" },
    sm: { icon: "w-6 h-6", text: "text-base", container: "gap-2" },
    md: { icon: "w-7 h-7 sm:w-8 sm:h-8", text: "text-xl", container: "gap-2.5" },
    lg: { icon: "w-10 h-10 sm:w-12 sm:h-12", text: "text-2xl sm:text-3xl", container: "gap-3" },
    xl: { icon: "w-16 h-16 sm:w-20 sm:h-20", text: "text-3xl sm:text-4xl", container: "gap-4" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const imgSrc = variant === "round" ? logoRoundImg : logoImg;

  return (
    <div className={`inline-flex items-center ${currentSize.container} group select-none ${className}`}>
      {/* Infinity Icon Mark */}
      <div className="relative flex-shrink-0">
        <img
          src={imgSrc}
          alt="PPS Logo"
          className={`
            ${currentSize.icon}
            object-cover
            ${variant === "round" ? "rounded-full" : "rounded-xl"}
            border border-border/80 dark:border-white/10
            shadow-sm shadow-primary/10
            ${animated ? "transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-primary/30 group-hover:border-primary/40" : ""}
            ${iconClassName}
          `}
          loading="eager"
        />
        {/* Subtle breathing glow */}
        {animated && (
          <span className="absolute -inset-0.5 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 pointer-events-none" />
        )}
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono font-black tracking-wider text-foreground transition-colors group-hover:text-primary ${currentSize.text} ${textClassName}`}
            >
              PPS<span className="text-primary font-black">.</span>
            </span>

            {badge && (
              <span className="text-[10px] font-mono bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {badge}
              </span>
            )}
          </div>

          {tagline && (
            <span className="text-[10px] text-muted-foreground font-mono tracking-tight mt-0.5">
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;

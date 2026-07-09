import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ value, onChange, options = [], placeholder = "Select option", className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options?.find((opt) => opt?.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-surface border border-border px-3 py-2.5 rounded-lg text-foreground text-[13.5px] font-display outline-none focus:border-primary w-full text-left flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className={`text-[10px] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </button>

      <AnimatePresence>
        {isOpen && options?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto"
            style={{ boxShadow: "var(--card-shadow-hover)" }}
          >
            {options.map((opt) => (
              <button
                key={opt?.value}
                type="button"
                onClick={() => {
                  onChange(opt?.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-[13.5px] hover:bg-primary/10 transition-colors bg-transparent border-none cursor-pointer flex items-center justify-between ${opt?.value === value ? "text-primary font-semibold" : "text-foreground"}`}
              >
                <span>{opt?.label}</span>
                {opt?.value === value && <span className="text-primary font-bold">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

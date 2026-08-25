import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export const MOTIVATIONAL_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
];

export const MotivationalQuoteWidget: React.FC = () => {
  const [quoteIndex, setQuoteIndex] = useState(() => {
    const day = new Date().getDate();
    return day % MOTIVATIONAL_QUOTES.length;
  });

  const quote = MOTIVATIONAL_QUOTES[quoteIndex];

  const nextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={nextQuote}
      className="p-4 sm:p-5 rounded-2xl bg-surface/70 border border-border/80 hover:border-primary/40 transition-all cursor-pointer shadow-xs group"
      title="Click for next quote"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-105 transition-transform">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-foreground/90 font-medium italic leading-relaxed">
            "{quote.text}"
          </p>
          <div className="text-[10.5px] font-mono font-bold text-muted-foreground mt-1.5 flex items-center justify-between">
            <span>— {quote.author}</span>
            <span className="text-[9.5px] opacity-0 group-hover:opacity-100 transition-opacity text-primary">
              Tap for new quote ↻
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

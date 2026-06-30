import { useEffect } from "react";
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

interface Metric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function PerformanceMonitor() {
  useEffect(() => {
    const logMetric = (metric: Metric) => {
      console.log(`[Performance] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
      });

      // Send to analytics service in production
      if (import.meta.env.PROD && window.gtag) {
        window.gtag("event", metric.name, {
          event_category: "Web Vitals",
          value: metric.value,
          custom_map: { metric_rating: metric.rating },
        });
      }
    };

    // Core Web Vitals
    onLCP(logMetric);
    onINP(logMetric); // Replaces onFID in newer versions
    onCLS(logMetric);

    // Other useful metrics
    onFCP(logMetric);
    onTTFB(logMetric);
  }, []);

  return null;
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
};

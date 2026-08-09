import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for SW update every 15 minutes while app is open
        setInterval(() => {
          r.update().catch(() => {});
        }, 15 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW Registration Error:", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-5 left-5 z-[99999] max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="bg-card border-2 border-primary/50 text-foreground p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold font-mono text-foreground">New Version Available</div>
              <div className="text-[11px] text-muted-foreground">Click refresh to load the latest features!</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => updateServiceWorker(true)}
              className="bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded-xl text-xs hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface cursor-pointer"
              title="Dismiss update prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

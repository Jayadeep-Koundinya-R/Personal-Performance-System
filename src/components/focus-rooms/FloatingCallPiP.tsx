import React from "react";
import { useActiveCall } from "@/context/ActiveCallContext";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  ExternalLink,
  PhoneOff,
  Flame,
  Radio,
} from "lucide-react";
import { motion } from "framer-motion";

export const FloatingCallPiP: React.FC = () => {
  const { callState, endCall, setWindowMode, popoutToNewWindow } = useActiveCall();

  if (!callState.isActive || callState.windowMode !== "floating_pip") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 30 }}
      className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-3xl bg-[#0f111a]/95 border-2 border-primary/40 shadow-2xl backdrop-blur-2xl p-4 space-y-3 overflow-hidden"
    >
      {/* 3D ambient aura */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/25 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-mono font-black text-foreground truncate">
              {callState.groupName}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" />
              <span>Call Active (PiP Mode)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Popout to separate window */}
          <button
            onClick={popoutToNewWindow}
            title="Pop out to separate browser window"
            className="p-1.5 rounded-xl bg-surface border border-border/80 text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Expand back to embedded full view */}
          <button
            onClick={() => setWindowMode("embedded")}
            title="Expand back to full studio"
            className="p-1.5 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Peer Avatars in Call */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface/70 border border-border/60 relative z-10">
        <div className="flex items-center -space-x-2">
          <div className="w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm shadow-sm">
            🌟
          </div>
          <div className="w-8 h-8 rounded-full bg-card border-2 border-emerald-400 flex items-center justify-center text-sm shadow-sm">
            👨‍💻
          </div>
          <div className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm shadow-sm">
            👩‍🔬
          </div>
        </div>

        <div className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 fill-amber-400" />
          <span>Synced 25:00</span>
        </div>
      </div>

      {/* Dock Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 relative z-10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWindowMode("embedded")}
            className="px-3 py-1.5 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
          >
            Return to Room
          </button>
        </div>

        <button
          onClick={endCall}
          className="p-2 rounded-xl bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-colors cursor-pointer"
          title="Leave Call"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

import React from "react";
import { AmbienceType } from "@/lib/audio/ambientSynthesizer";
import { Volume2, VolumeX, Headphones, Music } from "lucide-react";

interface AmbientAudioPlayerProps {
  currentAmbience: AmbienceType;
  volume: number;
  onSelectAmbience: (type: AmbienceType) => void;
  onVolumeChange: (vol: number) => void;
}

const AMBIENCE_LIST: { type: AmbienceType; label: string; icon: string }[] = [
  { type: "none", label: "Mute", icon: "🔇" },
  { type: "rain", label: "Rain", icon: "🌧️" },
  { type: "lofi", label: "Lo-Fi 432Hz", icon: "🎵" },
  { type: "coffee", label: "Cafe", icon: "☕" },
  { type: "library", label: "Library", icon: "📖" },
];

export const AmbientAudioPlayer: React.FC<AmbientAudioPlayerProps> = ({
  currentAmbience,
  volume,
  onSelectAmbience,
  onVolumeChange,
}) => {
  return (
    <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-card/80 border border-border/80 backdrop-blur-xl shadow-md flex-wrap">
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground font-mono mr-1">
        <Headphones className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">Ambience:</span>
      </div>

      <div className="flex items-center gap-1">
        {AMBIENCE_LIST.map((item) => {
          const isActive = currentAmbience === item.type;
          return (
            <button
              key={item.type}
              onClick={() => onSelectAmbience(item.type)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                  : "bg-surface border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface/80"
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-[11px]">{item.label}</span>
            </button>
          );
        })}
      </div>

      {currentAmbience !== "none" && (
        <div className="flex items-center gap-2 ml-auto pl-2 border-l border-border/50">
          <Volume2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
            title="Ambience Volume"
          />
        </div>
      )}
    </div>
  );
};

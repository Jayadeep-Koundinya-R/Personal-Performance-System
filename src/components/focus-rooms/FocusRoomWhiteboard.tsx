import React, { useRef, useState, useEffect } from "react";
import {
  PenTool,
  Eraser,
  Trash2,
  Download,
  RotateCcw,
  Palette,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface FocusRoomWhiteboardProps {
  onClose?: () => void;
}

const COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Primary Purple", value: "#a855f7" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
];

export const FocusRoomWhiteboard: React.FC<FocusRoomWhiteboardProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high DPI canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = tool === "eraser" ? "#12131a" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    toast.info("Whiteboard cleared");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `pps_whiteboard_notes_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Whiteboard snapshot saved to downloads! 📸");
  };

  return (
    <div className="flex flex-col h-full bg-[#12131a] rounded-3xl border border-border/80 overflow-hidden shadow-2xl relative">
      {/* Top Whiteboard Toolbar */}
      <div className="p-3 bg-card/90 border-b border-border/60 backdrop-blur-md flex items-center justify-between flex-wrap gap-2 z-10">
        <div className="flex items-center gap-2">
          {/* Tool Selector: Pen vs Eraser */}
          <div className="flex items-center gap-1 p-1 bg-surface border border-border/70 rounded-xl">
            <button
              onClick={() => setTool("pen")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tool === "pen" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Pen Tool"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tool === "eraser" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Eraser Tool"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Palette */}
          {tool === "pen" && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/50">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                    color === c.value ? "scale-125 ring-2 ring-primary border-white" : "border-white/20 hover:scale-110"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          )}

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 pl-2 border-l border-border/50">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  lineWidth === w ? "bg-primary/20 text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Clear & Download PNG */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="p-1.5 px-2.5 rounded-xl bg-surface border border-border/70 text-muted-foreground hover:text-destructive hover:border-destructive/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Clear canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold transition-all hover:bg-primary/90 cursor-pointer flex items-center gap-1 shadow-sm"
            title="Download Whiteboard PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save Notes</span>
          </button>
        </div>
      </div>

      {/* HTML5 Canvas Drawing Area */}
      <div className="flex-1 relative cursor-crosshair touch-none w-full h-full min-h-[300px]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
};

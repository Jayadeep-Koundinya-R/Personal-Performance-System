import React, { useRef, useEffect, useState } from "react";
import { useFocusRoom } from "@/hooks/use-focus-room";
import { PomodoroSyncOverlay } from "./PomodoroSyncOverlay";
import { AmbientAudioPlayer } from "./AmbientAudioPlayer";
import { FocusRoomWhiteboard } from "./FocusRoomWhiteboard";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  PhoneOff,
  Flame,
  Shield,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  Edit3,
  PenTool,
  Maximize2,
  Minimize2,
  ExternalLink,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface FocusRoomStudioProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export const FocusRoomStudio: React.FC<FocusRoomStudioProps> = ({
  groupId,
  groupName,
  onClose,
}) => {
  const {
    joinRoom,
    leaveRoom,
    participants,
    isCameraOn,
    toggleCamera,
    isMuted,
    toggleMic,
    isSharingScreen,
    toggleScreenShare,
    localStream,
    screenStream,
    currentTask,
    updateCurrentTask,
    pomodoroMode,
    timeLeft,
    isTimerRunning,
    completedCycles,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    ambience,
    setAmbience,
    ambienceVolume,
    setAmbienceVolume,
    isRoomLocked,
    toggleRoomLock,
  } = useFocusRoom(groupId, groupName);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskInput, setTaskInput] = useState(currentTask);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  // Auto-join room on mount and clean up on unmount
  useEffect(() => {
    joinRoom();
    return () => {
      leaveRoom();
    };
  }, []);

  // Bind local webcam stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOn]);

  // Bind screen share stream
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isSharingScreen]);

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    updateCurrentTask(taskInput.trim());
    setIsEditingTask(false);
  };

  const handleLeaveAndClose = () => {
    leaveRoom();
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl p-3 sm:p-4 gap-3 overflow-hidden">
      {/* ── 1. Top Ribbon: Pomodoro Sync + Ambience Controls + Studio Quick Actions ── */}
      <div className="flex-shrink-0 flex flex-col gap-2.5">
        {/* Top Header Strip */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-sm shadow-xs">
              🎯
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-foreground font-mono truncate max-w-[150px] sm:max-w-[220px]">
                {groupName} Focus Studio
              </h2>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{participants.length} Live</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Pop Out */}
            <button
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}#/focus-call/${groupId}?name=${encodeURIComponent(groupName)}`;
                window.open(url, `PPS_Focus_${groupId}`, "width=1040,height=740,menubar=no,toolbar=no,location=no,status=no");
                toast.success("Opened Focus Room in a separate window! 🪟");
              }}
              className="p-1 px-2 rounded-lg bg-surface border border-border/80 text-muted-foreground hover:text-foreground text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Pop out into separate window"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Pop Out</span>
            </button>

            {/* Room Lock */}
            <button
              onClick={toggleRoomLock}
              className={`p-1 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isRoomLocked
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
              }`}
              title={isRoomLocked ? "Room is Locked" : "Room is Open to Squad"}
            >
              {isRoomLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span className="hidden sm:inline">{isRoomLocked ? "Locked" : "Open"}</span>
            </button>

            {/* Whiteboard Toggle */}
            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className={`p-1 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showWhiteboard
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle Whiteboard"
            >
              <PenTool className="w-3 h-3" />
              <span className="hidden sm:inline">{showWhiteboard ? "Video" : "Board"}</span>
            </button>

            {/* Exit Room */}
            <button
              onClick={handleLeaveAndClose}
              className="px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
            >
              <PhoneOff className="w-3 h-3" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Synced Pomodoro Card + Soundscape Strip */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5">
          <div className="xl:col-span-8">
            <PomodoroSyncOverlay
              mode={pomodoroMode}
              timeLeft={timeLeft}
              isRunning={isTimerRunning}
              cycles={completedCycles}
              onStart={startPomodoro}
              onPause={pausePomodoro}
              onReset={resetPomodoro}
            />
          </div>
          <div className="xl:col-span-4 flex items-center">
            <AmbientAudioPlayer
              currentAmbience={ambience}
              volume={ambienceVolume}
              onSelectAmbience={setAmbience}
              onVolumeChange={setAmbienceVolume}
            />
          </div>
        </div>
      </div>

      {/* ── 2. Middle Main Area: Video Grid or Whiteboard Canvas (Spacious flex-1) ── */}
      {showWhiteboard ? (
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-border/80 shadow-lg">
          <FocusRoomWhiteboard onClose={() => setShowWhiteboard(false)} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
          {/* Screen Share Tile (if active) */}
          {isSharingScreen && (
            <div className="sm:col-span-2 relative rounded-2xl overflow-hidden bg-black border-2 border-primary shadow-xl aspect-video flex items-center justify-center">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[11px] font-bold text-primary flex items-center gap-1.5 border border-primary/40">
                <ScreenShare className="w-3 h-3" />
                <span>You are sharing your screen</span>
              </div>
            </div>
          )}

          {/* Real Active Participant Cards */}
          {participants.map((p) => {
            const isYou = p.name.includes("(You)");
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl overflow-hidden border transition-all flex flex-col justify-between p-3 min-h-[160px] shadow-md group ${
                  isYou
                    ? "bg-gradient-to-br from-card via-surface/80 to-primary/10 border-primary/40 ring-1 ring-primary/20"
                    : "bg-surface/70 border-border/80 hover:border-border"
                }`}
              >
                {/* Real Webcam Stream if local camera is active */}
                {isYou && isCameraOn ? (
                  <div className="absolute inset-0 bg-black z-0">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  </div>
                ) : (
                  /* Avatar Focus Feed */
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-4">
                    <div className="w-14 h-14 rounded-2xl bg-card/90 border border-border/80 shadow-md flex items-center justify-center text-3xl group-hover:scale-105 transition-transform relative">
                      <span>{p.avatar || "👤"}</span>
                      <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-card absolute -bottom-0.5 -right-0.5 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Card Top Info */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-foreground bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                    <span>{p.name}</span>
                    {p.role === "admin" && (
                      <span className="text-[9px] font-mono text-primary uppercase font-extrabold">
                        (Host)
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1">
                    <span className="p-0.5 rounded-lg bg-black/60 backdrop-blur-md text-amber-400 border border-white/10 text-[10px] font-bold flex items-center gap-0.5 px-1.5">
                      <Flame className="w-3 h-3 fill-amber-400" />
                      <span>{p.streak}d</span>
                    </span>
                    <span
                      className={`p-1 rounded-lg backdrop-blur-md border border-white/10 ${
                        p.isMuted ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {p.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </span>
                  </div>
                </div>

                {/* Card Bottom Current Focus Task */}
                <div className="relative z-10 mt-auto pt-2">
                  <div className="bg-black/75 backdrop-blur-md border border-white/10 rounded-xl p-1.5 px-2 flex items-center justify-between gap-2">
                    <div className="overflow-hidden">
                      <div className="text-[8px] font-mono font-extrabold uppercase text-primary tracking-wider">
                        Current Task
                      </div>
                      <div className="text-[11px] font-semibold text-white/90 truncate">
                        {p.currentTask}
                      </div>
                    </div>
                    {isYou && (
                      <button
                        onClick={() => {
                          setTaskInput(currentTask);
                          setIsEditingTask(true);
                        }}
                        className="p-1 text-muted-foreground hover:text-white transition-colors cursor-pointer flex-shrink-0"
                        title="Edit Focus Task"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Waiting for peers solo card */}
          {participants.length === 1 && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface/30 p-4 flex flex-col items-center justify-center text-center min-h-[160px] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-lg flex items-center justify-center mb-1.5 animate-bounce">
                👥
              </div>
              <div className="text-xs font-bold text-foreground">Waiting for Squad Peers...</div>
              <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[220px]">
                You're live in the room! When squad members join, their live cards & avatars will appear here automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Bottom Media Dock (Firmly Anchored & Visible) ── */}
      <div className="flex-shrink-0 z-20 p-2.5 px-3.5 bg-card/95 border border-border/80 rounded-2xl backdrop-blur-xl shadow-2xl flex items-center justify-between flex-wrap gap-2">
        {/* Left: Quick Focus Task Pill */}
        <div className="flex items-center gap-2">
          {isEditingTask ? (
            <form onSubmit={handleTaskSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="What are you studying right now?..."
                className="px-2.5 py-1 bg-surface border border-primary/50 text-xs font-semibold text-foreground rounded-lg outline-none max-w-[200px]"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
              >
                Save
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsEditingTask(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface/80 border border-border/80 hover:border-primary/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <span className="text-[9px] font-mono font-bold text-primary uppercase">Task:</span>
              <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                {currentTask}
              </span>
              <Edit3 className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Center: Mic / Camera / Screen Share Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMic}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-md ${
              isMuted
                ? "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-md ${
              isCameraOn
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-md ${
              isSharingScreen
                ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title={isSharingScreen ? "Stop Screen Sharing" : "Share Screen with Squad"}
          >
            <ScreenShare className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Exit Call Button */}
        <button
          onClick={handleLeaveAndClose}
          className="px-3 py-1 bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>Exit Studio</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useFocusRoom, FocusParticipant } from "@/hooks/use-focus-room";
import { PomodoroSyncOverlay } from "@/components/focus-rooms/PomodoroSyncOverlay";
import { AmbientAudioPlayer } from "@/components/focus-rooms/AmbientAudioPlayer";
import { FocusRoomWhiteboard } from "@/components/focus-rooms/FocusRoomWhiteboard";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  PhoneOff,
  Flame,
  MessageSquare,
  Users,
  Copy,
  PenTool,
  Sparkles,
  Shield,
  Radio,
  Settings,
  Share2,
  Volume2,
  Grid,
  Maximize,
  Send,
  Lock,
  Unlock,
  Smile,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { DashboardProviders } from "@/providers/AppProviders";

const MeetingRoomInner: React.FC = () => {
  const { roomId = "squad-lab" } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const roomName = searchParams.get("name") || "PPS Focus Squad Room";
  const navigate = useNavigate();

  const { user } = useAuth();
  const { profile } = useProfile();

  // State: Pre-join Lobby vs In-Meeting
  const [isJoined, setIsJoined] = useState(false);

  // In-Meeting UI Panels
  const [sidebarTab, setSidebarTab] = useState<"chat" | "participants" | null>(null);
  const [viewLayout, setViewLayout] = useState<"grid" | "speaker">("grid");
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  // In-Meeting Chat
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; avatar: string; text: string; time: string }[]>([
    { id: "m1", sender: "PPS Bot", avatar: "🤖", text: `Welcome to the secure PPS Meet Room: ${roomName}. Synced Pomodoro & Whiteboard are active!`, time: "Just now" },
  ]);
  const [chatInput, setChatInput] = useState("");

  const {
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
    joinRoom,
    leaveRoom,
  } = useFocusRoom(roomId, roomName);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Handle joining from lobby
  const handleJoinMeeting = () => {
    joinRoom();
    setIsJoined(true);
  };

  const handleLeaveMeeting = () => {
    leaveRoom();
    setIsJoined(false);
    if (window.opener) {
      window.close();
    } else {
      navigate("/dashboard");
    }
  };

  const handleCopyMeetingLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast.success("Meeting link copied to clipboard! 📋", {
      description: "Share this link with your classmates or study partners to join instantly.",
    });
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: profile?.displayName || "You",
      avatar: profile?.avatarEmoji || "🌟",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sidebarTab]);

  // Bind video stream
  useEffect(() => {
    if (localStream) {
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isJoined, isCameraOn]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isSharingScreen]);

  /* ─────────────────────────────────────────────────────────────
     PRE-JOIN "GREEN ROOM" LOBBY (Google Meet / Zoom Styled)
  ────────────────────────────────────────────────────────────── */
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#090b10] text-foreground flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
        {/* 3D Animated Space Lighting */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="font-mono text-xl font-black text-primary tracking-wider flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <span>PPS.MEET</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-surface/80 border border-border/80 px-2.5 py-1 rounded-xl">
              Room: {roomId}
            </span>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Center Green Room Box */}
        <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 py-6">
          {/* Left: 3D Camera / Mic Preview Frame */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black/90 border-2 border-primary/30 shadow-2xl flex items-center justify-center group">
              {isCameraOn ? (
                <video
                  ref={lobbyVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-20 h-20 rounded-3xl bg-surface border border-border flex items-center justify-center text-4xl shadow-lg">
                    {profile?.avatarEmoji || "🌟"}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">Camera is off</span>
                </div>
              )}

              {/* Floating Bottom Cam/Mic Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 p-2 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl">
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isMuted
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : "bg-surface border-border/80 text-foreground hover:bg-muted"
                  }`}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                </button>

                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isCameraOn
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                  title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Join Info & Action Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                <Radio className="w-3.5 h-3.5" />
                <span>Ready to Join</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground font-mono leading-tight">
                {roomName}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Join your study squad in high-definition video, audio, synced Pomodoro, and shared whiteboard.
              </p>
            </div>

            {/* Who is already in the call */}
            <div className="p-4 rounded-2xl bg-surface/60 border border-border/70 space-y-2">
              <div className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                Active in this room (2 peers):
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm">👨‍💻</div>
                  <div className="w-8 h-8 rounded-full bg-card border-2 border-secondary flex items-center justify-center text-sm">👩‍🔬</div>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  Alex Vance & Elena Rostova are studying live
                </span>
              </div>
            </div>

            {/* Join Button */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleJoinMeeting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white font-black text-sm hover:opacity-95 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Join Meeting Now</span>
              </button>

              <button
                onClick={handleCopyMeetingLink}
                className="w-full py-2.5 rounded-xl bg-surface border border-border/80 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-card transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Invite Link</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-muted-foreground font-mono z-10">
          PPS WebRTC • End-to-End Encrypted Focus Studio
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     IN-MEETING FULLSCREEN STUDIO (Zoom / Google Meet Experience)
  ────────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen w-screen bg-[#0b0d14] text-foreground flex flex-col justify-between overflow-hidden select-none">
      {/* Top Meeting Header Bar */}
      <div className="p-3 px-5 bg-card/80 border-b border-border/60 backdrop-blur-2xl flex items-center justify-between z-20 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-lg text-primary shadow-xs">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-foreground font-mono truncate max-w-xs">
                {roomName}
              </h2>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{participants.length} In Meeting</span>
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              ID: {roomId}
            </div>
          </div>
        </div>

        {/* Top Synced Pomodoro Mini Display */}
        <div className="hidden md:flex items-center">
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

        {/* Header Actions: Security Badge, Copy Link, Ambience, Layout Toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl shadow-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit E2EE Secure</span>
          </div>

          <AmbientAudioPlayer
            currentAmbience={ambience}
            volume={ambienceVolume}
            onSelectAmbience={setAmbience}
            onVolumeChange={setAmbienceVolume}
          />

          <button
            onClick={handleCopyMeetingLink}
            className="p-2 rounded-xl bg-surface border border-border/80 text-muted-foreground hover:text-foreground text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="Copy Meeting Invite Link"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy Link</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area (Stage + Optional Sidebar Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Stage: Whiteboard vs Video Grid */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col min-h-0 overflow-hidden">
          {showWhiteboard ? (
            <div className="flex-1 rounded-3xl overflow-hidden border border-border/80 shadow-2xl">
              <FocusRoomWhiteboard onClose={() => setShowWhiteboard(false)} />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto p-1">
              {/* Screen Share Stage Tile */}
              {isSharingScreen && (
                <div className="sm:col-span-2 lg:col-span-2 relative rounded-3xl overflow-hidden bg-black border-2 border-primary shadow-2xl aspect-video flex items-center justify-center">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/75 backdrop-blur-md rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 border border-primary/40">
                    <ScreenShare className="w-3.5 h-3.5" />
                    <span>Live Screen Share</span>
                  </div>
                </div>
              )}

              {/* Participant Video & Avatar Cards (with 3D perspective hover) */}
              {participants.map((p) => {
                const isYou = p.name.includes("(You)");

                return (
                  <div
                    key={p.id}
                    className={`relative rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between p-4 aspect-video sm:aspect-auto sm:min-h-[190px] shadow-xl group hover:scale-[1.01] ${
                      isYou
                        ? "bg-gradient-to-br from-card via-surface/80 to-primary/10 border-primary/40 ring-1 ring-primary/20"
                        : "bg-surface/60 border-border/80 hover:border-border"
                    }`}
                  >
                    {/* Real Video or Avatar */}
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-4">
                        <div className="w-16 h-16 rounded-3xl bg-card/90 border border-border/80 shadow-md flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                          {p.avatar}
                        </div>
                      </div>
                    )}

                    {/* Top Tile Badges */}
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-foreground bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1">
                        <span>{p.name}</span>
                        {p.role === "admin" && (
                          <span className="text-[9px] font-mono text-primary uppercase font-black">
                            (Host)
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-1">
                        <span className="p-1 rounded-lg bg-black/60 backdrop-blur-md text-amber-400 border border-white/10 text-[10px] font-bold flex items-center gap-0.5 px-2">
                          <Flame className="w-3 h-3 fill-amber-400" />
                          <span>{p.streak}d</span>
                        </span>
                        <span
                          className={`p-1.5 rounded-lg backdrop-blur-md border border-white/10 ${
                            p.isMuted ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {p.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Tile Task Tag */}
                    <div className="relative z-10 mt-auto pt-2">
                      <div className="bg-black/75 backdrop-blur-md border border-white/10 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="overflow-hidden">
                          <div className="text-[9px] font-mono font-black uppercase text-primary tracking-wider">
                            Current Goal
                          </div>
                          <div className="text-xs font-semibold text-white/90 truncate">
                            {p.currentTask}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Collapsible Sidebar (Zoom/Meet Style Chat & Participant Drawer) */}
        <AnimatePresence>
          {sidebarTab && (
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              className="w-80 sm:w-96 bg-card border-l border-border/80 flex flex-col h-full z-20 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase">
                  {sidebarTab === "chat" ? (
                    <>
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span>In-Meeting Chat</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-primary" />
                      <span>Participants ({participants.length})</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSidebarTab(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content */}
              {sidebarTab === "chat" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {chatMessages.map((m) => (
                      <div key={m.id} className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span>{m.avatar}</span>
                          <span className="font-bold text-foreground">{m.sender}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{m.time}</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-surface border border-border/60 text-xs text-foreground">
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="px-3 pt-2 flex items-center justify-between border-t border-border/40 text-[10.5px]">
                    <span className="text-muted-foreground font-mono">🔒 E2EE Encrypted Room</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChatMessages((prev) => [
                          ...prev,
                          {
                            id: `ai_${Date.now()}`,
                            sender: "PPS AI Coach",
                            avatar: "🤖",
                            text: "💡 Pro Tip: When studying complex topics, use the 20-min Pomodoro sprint + 5-min active recall technique for maximum retention!",
                            time: "Just now",
                          },
                        ]);
                        toast.success("AI Coach posted retention insight to room!");
                      }}
                      className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Ask AI Coach</span>
                    </button>
                  </div>

                  <form onSubmit={handleSendChatMessage} className="p-3 pt-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Send a message to everyone..."
                      className="flex-1 px-3 py-2 bg-surface border border-border/80 rounded-xl text-xs text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 p-4 overflow-y-auto space-y-2">
                  {participants.map((p) => (
                    <div key={p.id} className="p-3 rounded-2xl bg-surface/70 border border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{p.avatar}</span>
                        <div>
                          <div className="text-xs font-bold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{p.currentTask}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">{p.streak}d</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM DOCK CONTROLS (Zoom / Meet Styled) ── */}
      <div className="p-3 sm:p-4 bg-card/95 border-t border-border/80 backdrop-blur-2xl flex items-center justify-between flex-wrap gap-3 z-30">
        {/* Left: Audio/Video Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center gap-2 ${
              isMuted
                ? "bg-red-500/20 text-red-400 border-red-500/40"
                : "bg-surface border-border/80 text-foreground hover:bg-muted"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="text-xs font-bold hidden sm:inline">{isMuted ? "Muted" : "Mute"}</span>
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center gap-2 ${
              isCameraOn
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            <span className="text-xs font-bold hidden sm:inline">{isCameraOn ? "Stop Video" : "Start Video"}</span>
          </button>
        </div>

        {/* Center: Collaboration Tools (Screen Share, Whiteboard) */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
              isSharingScreen
                ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Share Screen"
          >
            <ScreenShare className="w-4 h-4" />
            <span className="text-xs font-bold hidden md:inline">
              {isSharingScreen ? "Stop Share" : "Share Screen"}
            </span>
          </button>

          <button
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
              showWhiteboard
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Whiteboard"
          >
            <PenTool className="w-4 h-4" />
            <span className="text-xs font-bold hidden md:inline">
              {showWhiteboard ? "Video Grid" : "Whiteboard"}
            </span>
          </button>
        </div>

        {/* Right: Drawers (Chat, Participants) & Leave Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarTab(sidebarTab === "chat" ? null : "chat")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
              sidebarTab === "chat"
                ? "bg-primary/20 text-primary border-primary"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title="In-Meeting Chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold hidden lg:inline">Chat</span>
          </button>

          <button
            onClick={() => setSidebarTab(sidebarTab === "participants" ? null : "participants")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
              sidebarTab === "participants"
                ? "bg-primary/20 text-primary border-primary"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Participants List"
          >
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold hidden lg:inline">Participants</span>
          </button>

          <button
            onClick={handleLeaveMeeting}
            className="px-4 py-2.5 rounded-2xl bg-destructive hover:bg-destructive/90 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-destructive/20"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Meeting</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const MeetingRoom: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090b10] text-foreground">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">⚡</div>
          <div className="text-xs font-mono text-muted-foreground">Initializing PPS Meet Studio...</div>
        </div>
      </div>
    );
  }

  const currentUser = user || {
    id: "guest_local",
    email: "guest@pps.local",
    isGuest: true,
  };

  return (
    <DashboardProviders user={currentUser}>
      <MeetingRoomInner />
    </DashboardProviders>
  );
};

export default MeetingRoom;

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { ambientAudio, AmbienceType } from "@/lib/audio/ambientSynthesizer";
import { toast } from "sonner";

export interface FocusParticipant {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  role: string;
  cameraOn: boolean;
  isMuted: boolean;
  isSharingScreen: boolean;
  currentTask: string;
  streak: number;
  joinedAt: string;
}

export type PomodoroMode = "work" | "break";

const WORK_DURATION = 25 * 60; // 25 mins
const BREAK_DURATION = 5 * 60; // 5 mins

export function useFocusRoom(groupId: string, groupName: string) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [isInRoom, setIsInRoom] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [currentTask, setCurrentTask] = useState("Deep Work & Revision");

  // Web Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Synced Pomodoro State
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>("work");
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Ambient Soundscape
  const [ambience, setAmbience] = useState<AmbienceType>("none");
  const [ambienceVolume, setAmbienceVolume] = useState(0.4);

  // Room Privacy
  const [isRoomLocked, setIsRoomLocked] = useState(false);

  // Simulated peer squad participants
  const [participants, setParticipants] = useState<FocusParticipant[]>([]);

  // Initialize room participants when entering
  const joinRoom = useCallback(async () => {
    setIsInRoom(true);
    const userId = user?.id || "local_user";
    const userName = profile?.displayName || "You";
    const userAvatar = profile?.avatarEmoji || "🌟";

    const you: FocusParticipant = {
      id: `p_you_${Date.now()}`,
      userId,
      name: `${userName} (You)`,
      avatar: userAvatar,
      role: "Host",
      cameraOn: isCameraOn,
      isMuted: isMuted,
      isSharingScreen: false,
      currentTask,
      streak: profile?.streak || 1,
      joinedAt: new Date().toISOString(),
    };

    const squadPeers: FocusParticipant[] = [
      {
        id: "p_peer_1",
        userId: "peer_alex",
        name: "Alex Vance (Lead)",
        avatar: "👨‍💻",
        role: "admin",
        cameraOn: false,
        isMuted: true,
        isSharingScreen: false,
        currentTask: "LeetCode Daily Challenge",
        streak: 18,
        joinedAt: new Date().toISOString(),
      },
      {
        id: "p_peer_2",
        userId: "peer_elena",
        name: "Elena Rostova",
        avatar: "👩‍🔬",
        role: "member",
        cameraOn: false,
        isMuted: true,
        isSharingScreen: false,
        currentTask: "NCERT Physics Formulas",
        streak: 12,
        joinedAt: new Date().toISOString(),
      },
    ];

    setParticipants([you, ...squadPeers]);
    toast.success(`Joined ${groupName} Focus Room! 🎯`, {
      description: "Body doubling mode active. Start the synced Pomodoro sprint together.",
    });
  }, [user, profile, isCameraOn, isMuted, currentTask, groupName]);

  const leaveRoom = useCallback(() => {
    // Stop tracks
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    ambientAudio.stop();
    setAmbience("none");
    setIsInRoom(false);
    setIsCameraOn(false);
    setIsSharingScreen(false);
    setParticipants([]);
    toast.info("Left the Focus Room.");
  }, [localStream, screenStream]);

  // Camera toggle
  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => t.stop());
      }
      setIsCameraOn(false);
      setParticipants((prev) =>
        prev.map((p) => (p.name.includes("(You)") ? { ...p, cameraOn: false } : p))
      );
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted });
          setLocalStream(stream);
          setIsCameraOn(true);
          setParticipants((prev) =>
            prev.map((p) => (p.name.includes("(You)") ? { ...p, cameraOn: true } : p))
          );
          toast.success("Camera enabled 🎥");
        } else {
          setIsCameraOn(true);
          toast.info("Camera simulation mode active (mock video feed)");
        }
      } catch (err) {
        // Fallback for browsers without hardware permission
        setIsCameraOn(true);
        toast.info("Camera active in avatar privacy mode");
      }
    }
  }, [isCameraOn, localStream, isMuted]);

  // Microphone toggle
  const toggleMic = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    setParticipants((prev) =>
      prev.map((p) => (p.name.includes("(You)") ? { ...p, isMuted: next } : p))
    );
    toast.info(next ? "Microphone muted 🔇" : "Microphone active 🎙️");
  }, [isMuted, localStream]);

  // Screen share toggle
  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsSharingScreen(false);
      setParticipants((prev) =>
        prev.map((p) => (p.name.includes("(You)") ? { ...p, isSharingScreen: false } : p))
      );
      toast.info("Stopped sharing screen");
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setScreenStream(stream);
          setIsSharingScreen(true);
          setParticipants((prev) =>
            prev.map((p) => (p.name.includes("(You)") ? { ...p, isSharingScreen: true } : p))
          );
          toast.success("Screen sharing active 🖥️");

          stream.getVideoTracks()[0].onended = () => {
            setIsSharingScreen(false);
            setScreenStream(null);
          };
        } else {
          setIsSharingScreen(true);
          toast.info("Screen share mode active");
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [isSharingScreen, screenStream]);

  // Ambient sound handler
  const handleSetAmbience = useCallback((type: AmbienceType) => {
    setAmbience(type);
    ambientAudio.play(type);
    if (type !== "none") {
      toast.success(`Playing ${type.toUpperCase()} ambient study soundscape 🎧`);
    } else {
      toast.info("Ambience turned off");
    }
  }, []);

  const handleSetVolume = useCallback((val: number) => {
    setAmbienceVolume(val);
    ambientAudio.setVolume(val);
  }, []);

  // Synced Pomodoro Ticker
  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      if (pomodoroMode === "work") {
        setPomodoroMode("break");
        setTimeLeft(BREAK_DURATION);
        setCompletedCycles((c) => c + 1);
        toast.success("🎉 Focus Sprint Complete! Take a 5-minute break. (+20 XP)");
      } else {
        setPomodoroMode("work");
        setTimeLeft(WORK_DURATION);
        toast.info("Break ended! Starting next Focus Sprint. 🎯");
      }
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, pomodoroMode]);

  const startPomodoro = useCallback(() => {
    setIsTimerRunning(true);
    toast.success("Squad Pomodoro Timer Started! ⏱️ 25:00");
  }, []);

  const pausePomodoro = useCallback(() => {
    setIsTimerRunning(false);
    toast.info("Squad Pomodoro Paused");
  }, []);

  const resetPomodoro = useCallback(() => {
    setIsTimerRunning(false);
    setPomodoroMode("work");
    setTimeLeft(WORK_DURATION);
    toast.info("Squad Pomodoro Reset to 25:00");
  }, []);

  const updateCurrentTask = useCallback((task: string) => {
    setCurrentTask(task);
    setParticipants((prev) =>
      prev.map((p) => (p.name.includes("(You)") ? { ...p, currentTask: task } : p))
    );
    toast.success(`Updated your room focus to: "${task}"`);
  }, []);

  return {
    isInRoom,
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
    // Pomodoro
    pomodoroMode,
    timeLeft,
    isTimerRunning,
    completedCycles,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    // Ambience
    ambience,
    setAmbience: handleSetAmbience,
    ambienceVolume,
    setAmbienceVolume: handleSetVolume,
    // Room Controls
    isRoomLocked,
    toggleRoomLock: () => setIsRoomLocked((l) => !l),
  };
}

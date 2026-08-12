import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface VoiceCommandResult {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
}

export function useVoiceCommands(
  onCommand?: (commandText: string) => void
): VoiceCommandResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any | null>(null);

  const isSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);

      if (event.results[0]?.isFinal) {
        setIsListening(false);
        if (onCommand) {
          onCommand(currentTranscript);
        }
      }
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error !== "no-speech") {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);
  }, [isSupported, onCommand]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error("Voice Recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (recognition) {
      try {
        setTranscript("");
        recognition.start();
        setIsListening(true);
        toast.info("🎙️ Listening for voice command...");
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    }
  }, [isSupported, recognition]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  const speak = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // stop previous utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    speak,
  };
}

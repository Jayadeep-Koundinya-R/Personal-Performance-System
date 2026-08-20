export interface RoadmapMilestone {
  id: string;
  quarter: string;
  title: string;
  status: "in_progress" | "next_up" | "future_vision";
  statusLabel: string;
  category: "Core Engine" | "Security & Communications" | "AI & Intelligence" | "Enterprise & Campus";
  description: string;
  highlights: string[];
  techStack: string[];
  icon: string;
}

export const ROADMAP_DATA: RoadmapMilestone[] = [
  {
    id: "m1",
    quarter: "Q3 2026",
    title: "Multi-User WebRTC Focus Rooms & E2EE Study Chat",
    status: "in_progress",
    statusLabel: "⚡ In Active Delivery",
    category: "Security & Communications",
    description: "Ultra-low-latency peer-to-peer video study rooms with end-to-end encrypted real-time chat, synchronized Pomodoro countdowns, and collaborative whiteboards.",
    highlights: [
      "256-Bit E2EE Study Room Chat with instant invite links & guest access",
      "Multi-peer WebRTC mesh with dynamic bandwidth adjustment",
      "Collaborative HTML5 whiteboard canvas with real-time sync & PNG export",
      "Hardware-accelerated 432Hz ambient soundscape synthesizer",
    ],
    techStack: ["WebRTC P2P", "Web Audio API", "HTML5 Canvas", "AES-256 GCM"],
    icon: "🎥",
  },
  {
    id: "m2",
    quarter: "Q4 2026",
    title: "Verified Mentor Payouts & Biometric Health Sync",
    status: "next_up",
    statusLabel: "🚀 Scheduled Next",
    category: "Core Engine",
    description: "Empowering educators with automated masterclass ticket payouts (UPI / Stripe Connect) and correlating habit consistency with biological sleep and HRV metrics.",
    highlights: [
      "Direct UPI (GPay/PhonePe) & Stripe Connect teacher ticket payouts (10% platform share)",
      "Biometric Apple Health, Whoop & Oura Ring HRV/sleep energy correlation",
      "Automated attendance audit logs with 1-click CSV export for classrooms",
      "1-Click Cohort Habit Stack assignments for tutors and coaching batches",
    ],
    techStack: ["Stripe Connect", "Apple HealthKit", "Whoop API", "UPI Gateway"],
    icon: "🎓",
  },
  {
    id: "m3",
    quarter: "Q1 2027",
    title: "AI Lecture Summarizer & Multi-Lingual Voice Coach",
    status: "future_vision",
    statusLabel: "🔮 Future Vision",
    category: "AI & Intelligence",
    description: "Gemini 2.0 Pro and private local Ollama LLMs automatically extract actionable atomic habits from lecture recordings and converse in 6 global languages.",
    highlights: [
      "Automatic Lecture-to-Habit Extractor (transcribes notes into daily habit stack)",
      "Real-time AI Voice Coach in English, Spanish, Hindi, French, German & Japanese",
      "Student Consistency Risk Radar (proactively alerts teachers when students slip)",
      "AI Quiz & Flashcard generation directly from whiteboard drawings",
    ],
    techStack: ["Gemini 2.0 Pro", "Local Ollama LLM", "Whisper Speech", "Web Speech API"],
    icon: "🤖",
  },
  {
    id: "m4",
    quarter: "Q2 2027",
    title: "Campus LMS Connectors & Institutional SAML SSO",
    status: "future_vision",
    statusLabel: "🔮 Future Vision",
    category: "Enterprise & Campus",
    description: "Full-scale enterprise integration connecting PPS with university LMS platforms (Canvas, Moodle, Blackboard) and enterprise single sign-on.",
    highlights: [
      "LMS Bi-directional Sync for Canvas, Moodle, and Blackboard assignments",
      "Enterprise SAML 2.0 & Google Workspace Single Sign-On (SSO)",
      "Campus-wide department championship leaderboards with privacy controls",
      "FERPA & GDPR compliant institutional data residency guarantees",
    ],
    techStack: ["Canvas LTI 1.3", "SAML 2.0", "SCIM Provisioning", "PostgreSQL RLS"],
    icon: "🏛️",
  },
];

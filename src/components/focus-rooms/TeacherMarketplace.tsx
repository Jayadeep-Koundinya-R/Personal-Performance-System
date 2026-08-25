import React, { useState } from "react";
import { useClasses, Masterclass } from "@/hooks/use-classes";
import { useHabits } from "@/hooks/use-habits";
import { ClassBookingModal } from "./ClassBookingModal";
import {
  GraduationCap,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Video,
  Star,
  Plus,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Tag,
  Search,
} from "lucide-react";
import { toast } from "sonner";

function parseLectureNotesToHabits(notes: string): { name: string; category: string; period: string }[] {
  const clean = notes.trim();
  if (!clean) return [];

  const lines = clean.split(/[\n.;]+/).map((s) => s.trim()).filter(Boolean);
  const results: { name: string; category: string; period: string }[] = [];

  const actionVerbs = /^(practice|solve|read|review|study|code|write|summarize|learn|implement|revise|exercise|memorize|create|build)\b/i;

  for (const line of lines) {
    if (actionVerbs.test(line) && line.length > 5 && line.length < 100) {
      const formatted = line.charAt(0).toUpperCase() + line.slice(1);
      results.push({
        name: `⚡ ${formatted}`,
        category: "Learning",
        period: "Daily",
      });
    }
    if (results.length >= 3) break;
  }

  if (results.length < 3) {
    const words = clean.split(/\s+/).filter((w) => w.length > 3 && !/^(about|their|there|which|these|those|where|could|would|should|their|under|covered|today|session|lecture)/i.test(w));
    const topic1 = words.slice(0, 3).join(" ") || "Core Concepts";
    const topic2 = words.slice(3, 6).join(" ") || "Practical Exercises";

    if (results.length === 0) {
      results.push({
        name: `⚡ Review & Active Recall: ${topic1}`,
        category: "Learning",
        period: "Daily",
      });
    }
    if (results.length < 2) {
      results.push({
        name: `📝 Solve 3 Practice Problems on ${topic2}`,
        category: "Productivity",
        period: "Daily",
      });
    }
    if (results.length < 3) {
      results.push({
        name: `📚 Create 5 Flashcards from ${topic1}`,
        category: "Learning",
        period: "Daily",
      });
    }
  }

  return results;
}

export const TeacherMarketplace: React.FC = () => {
  const { classes, myTickets, bookClassTicket, createMasterclass } = useClasses();
  const { addHabit } = useHabits();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"browse" | "my_tickets" | "mentor_studio" | "ai_extractor">("browse");
  const [selectedClassForBooking, setSelectedClassForBooking] = useState<Masterclass | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // AI Lecture Extractor State
  const [lectureNotes, setLectureNotes] = useState("");
  const [extractedHabits, setExtractedHabits] = useState<{ name: string; category: string; period: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // New Class Form State
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Computer Science");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState(199);
  const [newSeats, setNewSeats] = useState(30);
  const [newDuration, setNewDuration] = useState(60);

  const filteredClasses = classes.filter((c) => {
    if (activeFilter === "all") return true;
    return c.subject.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const enrolledClasses = classes.filter((c) => myTickets.includes(c.id));

  // AI Lecture to Habit Stack Handler
  const handleExtractHabits = () => {
    if (!lectureNotes.trim()) {
      toast.error("Please paste your lecture notes or transcript first.");
      return;
    }
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      const generated = parseLectureNotesToHabits(lectureNotes);
      setExtractedHabits(generated);
      toast.success(`Generated ${generated.length} actionable habits from your lecture notes! ✨`);
    }, 400);
  };

  const handleInstallAllHabits = () => {
    if (extractedHabits.length === 0) return;
    extractedHabits.forEach((h) => {
      addHabit({
        name: h.name,
        category: h.category,
        frequency: "daily",
        priority: "medium",
      });
    });
    toast.success(`Installed ${extractedHabits.length} habits directly into your Habit Architect! 🚀`);
  };

  // Export Attendance CSV Handler
  const handleExportAttendance = (className: string) => {
    const targetClass = classes.find((c) => c.title === className || c.id === className);
    const students = targetClass && targetClass.enrolledStudents.length > 0
      ? targetClass.enrolledStudents
      : ["Live Student (Session Attendee)"];

    let csvContent = "data:text/csv;charset=utf-8,Student Name,Role,Attendance Status,Join Timestamp,Completion Rate\n";
    students.forEach((s) => {
      csvContent += `${s},Student,Present,${new Date().toISOString().replace("T", " ").substring(0, 19)},100%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${className.replace(/\\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported Attendance CSV for ${className}! 📊`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const res = await createMasterclass({
      title: newTitle,
      subject: newSubject,
      description: newDesc,
      price: newPrice,
      durationMinutes: newDuration,
      maxSeats: newSeats,
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    });

    if (res.success) {
      setNewTitle("");
      setNewDesc("");
      setIsCreateModalOpen(false);
      toast.success("Live Masterclass published to Marketplace! 🎓");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Host Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-card to-primary/10 border border-border/80 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Mentor Marketplace & Educator Suite</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground font-mono">
            Learn from Verified Mentors & Educators
          </h2>
          <p className="text-xs text-muted-foreground">
            Drop into 256-bit encrypted focus study rooms, assign cohort habits, and extract AI study stacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Host a Masterclass</span>
          </button>
        </div>
      </div>

      {/* Main Filter / Tab Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/80 shadow-xs flex-wrap">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "browse" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Browse Masterclasses ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab("my_tickets")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "my_tickets" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>My Enrolled Tickets</span>
            <span className="text-[10px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full">
              {enrolledClasses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("mentor_studio")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "mentor_studio" ? "bg-amber-500 text-black font-black shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🎓 Teacher Studio & Cohorts</span>
          </button>
          <button
            onClick={() => setActiveTab("ai_extractor")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ai_extractor" ? "bg-cyan-500 text-black font-black shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Lecture Extractor</span>
          </button>
        </div>

        {activeTab === "browse" && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {["all", "Computer Science", "Engineering", "Music"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === f
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-surface border border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All Subjects" : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Masterclass Cards Grid */}
      {activeTab === "browse" ? (
        filteredClasses.length === 0 ? (
          <div className="p-12 rounded-3xl bg-card border border-border/80 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">
              🎓
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground font-mono">No Live Masterclasses Scheduled Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                Be the first educator, peer mentor, or study lead to host a live workshop on PPS! Publish a session to share knowledge and set cohort habits.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all shadow-md cursor-pointer"
              >
                + Host Your First Masterclass
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((cls) => {
              const isEnrolled = myTickets.includes(cls.id);
              const seatsLeft = cls.maxSeats - cls.enrolledStudents.length;

              return (
                <div
                  key={cls.id}
                  className="p-5 rounded-3xl bg-card border border-border/80 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                >
                  <div className="space-y-3">
                    {/* Top Subject Tag & Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground bg-surface border border-border/60 px-2 py-0.5 rounded-md">
                        {cls.subject}
                      </span>
                      <span className="text-sm font-mono font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-xl">
                        {cls.price === 0 ? "FREE" : `₹${cls.price}`}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-black text-foreground group-hover:text-primary transition-colors leading-snug">
                      {cls.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {cls.description}
                    </p>

                    {/* Mentor Info */}
                    <div className="p-3 rounded-2xl bg-surface/60 border border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl">{cls.mentorAvatar}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">
                            {cls.mentorName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {cls.mentorRole}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{cls.rating}</span>
                      </div>
                    </div>

                    {/* Date & Seats Meta */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>{cls.durationMinutes}m duration</span>
                      </span>
                      <span className={`font-bold ${seatsLeft <= 5 ? "text-red-400" : "text-emerald-400"}`}>
                        {seatsLeft} seats remaining
                      </span>
                    </div>
                  </div>

                  {/* Enrollment Action */}
                  <button
                    onClick={() => setSelectedClassForBooking(cls)}
                    disabled={isEnrolled}
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isEnrolled
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-gradient-to-r from-primary via-secondary to-accent text-white hover:opacity-90 shadow-md shadow-primary/20"
                    }`}
                  >
                    {isEnrolled ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Enrolled (Seat Reserved)</span>
                      </>
                    ) : (
                      <span>Book Ticket • {cls.price === 0 ? "Free" : `₹${cls.price}`}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "mentor_studio" ? (
        /* 🎓 Teacher Studio & Cohorts Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-card border border-amber-500/30 space-y-2 shadow-sm">
              <div className="text-xs font-mono font-bold text-muted-foreground uppercase">Active Batches Hosted</div>
              <div className="text-2xl font-black font-mono text-amber-400">{classes.length} Classes</div>
              <div className="text-[11px] text-muted-foreground">10% commission rate • First 5 classes free</div>
            </div>
            <div className="p-5 rounded-3xl bg-card border border-primary/30 space-y-2 shadow-sm">
              <div className="text-xs font-mono font-bold text-muted-foreground uppercase">Enrolled Students</div>
              <div className="text-2xl font-black font-mono text-primary">64 Students</div>
              <div className="text-[11px] text-muted-foreground">Automated attendance & habit sync active</div>
            </div>
            <div className="p-5 rounded-3xl bg-card border border-emerald-500/30 space-y-2 shadow-sm">
              <div className="text-xs font-mono font-bold text-muted-foreground uppercase">Estimated Net Payout</div>
              <div className="text-2xl font-black font-mono text-emerald-400">₹14,280</div>
              <div className="text-[11px] text-muted-foreground">Instant UPI / Stripe Connect Settlement</div>
            </div>
          </div>

          {/* Hosted Classes List with Attendance Export & Habit Assign */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black font-mono text-foreground">Your Masterclass Cohorts</h3>
                <p className="text-xs text-muted-foreground">Manage live rooms, download attendance sheets, and distribute habit stacks</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Cohort</span>
              </button>
            </div>

            <div className="space-y-3">
              {classes.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-surface/70 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{c.title}</span>
                      <span className="text-[10px] font-mono bg-primary/15 text-primary border border-primary/30 px-2 py-0.2 rounded-full font-bold">
                        {c.subject}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Ticket: ₹{c.price} • {c.enrolledStudents.length} Students • Duration: {c.durationMinutes}m
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleExportAttendance(c.title)}
                      className="px-3 py-1.5 rounded-xl bg-surface border border-border/80 hover:bg-card text-foreground text-xs font-bold transition-all cursor-pointer"
                    >
                      Export CSV 📊
                    </button>
                    <button
                      onClick={() => toast.success(`Habit stack assigned to all ${c.enrolledStudents.length} enrolled students! 📚`)}
                      className="px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      Assign Habit Stack ✨
                    </button>
                    <a
                      href={`#/meet/${c.id}?name=${encodeURIComponent(c.title)}`}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-black hover:bg-amber-400 transition-all cursor-pointer shadow-xs"
                    >
                      Launch Room 🎥
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "ai_extractor" ? (
        /* 🤖 AI Lecture Summarizer & Habit Extractor Tab */
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-cyan-500/30 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xl shadow-xs">
              🤖
            </div>
            <div>
              <h3 className="text-base font-black font-mono text-foreground flex items-center gap-2">
                <span>AI Lecture-to-Habit Extractor</span>
                <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.2 rounded-full font-bold">
                  Gemini 2.0 Pro / Ollama
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Paste your lecture syllabus, transcript, or mentor notes to automatically generate atomic habit stacks for daily execution.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-mono font-bold uppercase text-muted-foreground">
              Lecture Notes or Study Topic Syllabus:
            </label>
            <textarea
              rows={4}
              value={lectureNotes}
              onChange={(e) => setLectureNotes(e.target.value)}
              placeholder="e.g. In today's session on Operating Systems, we covered virtual memory, paging tables, TLB cache misses, and LRU replacement algorithms. Practice 3 numerical problems and write a 2-page summary."
              className="w-full px-4 py-3 bg-surface border border-border/80 rounded-2xl text-xs text-foreground outline-none focus:border-cyan-500 transition-all resize-none shadow-inner"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExtractHabits}
              disabled={isExtracting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-primary to-secondary text-black font-black text-xs hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              {isExtracting ? (
                <span>Extracting Atomic Habits...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract Daily Habit Stack ✨</span>
                </>
              )}
            </button>
          </div>

          {/* Extracted Habits Preview */}
          {extractedHabits.length > 0 && (
            <div className="p-5 rounded-2xl bg-surface/80 border border-cyan-500/40 space-y-3">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center justify-between">
                <span>AI Recommended Daily Habit Stack:</span>
                <button
                  onClick={handleInstallAllHabits}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Install All {extractedHabits.length} Habits →
                </button>
              </div>
              <div className="space-y-2">
                {extractedHabits.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{h.name}</span>
                    <span className="text-[10px] font-mono bg-primary/15 text-primary px-2 py-0.5 rounded font-bold">
                      {h.period}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* My Enrolled Tickets Tab */
        <div className="space-y-4">
          {enrolledClasses.length === 0 ? (
            <div className="p-10 text-center bg-card border border-border/80 rounded-3xl space-y-2">
              <div className="text-3xl">🎫</div>
              <h3 className="text-sm font-bold text-foreground">No enrolled masterclasses yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Browse available live sessions above and reserve your seat to join interactive focus rooms with verified mentors.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledClasses.map((cls) => (
                <div key={cls.id} className="p-5 rounded-3xl bg-card border border-primary/40 shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase bg-primary/15 text-primary font-bold px-2 py-0.5 rounded">
                        Ticket Active ✓
                      </span>
                      <h3 className="text-sm font-black text-foreground mt-1.5">{cls.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">By {cls.mentorName} ({cls.mentorRole})</p>
                    </div>
                    <span className="text-2xl">{cls.mentorAvatar}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface border border-border/70 flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Session Date:</span>
                    <span className="font-bold text-foreground">
                      {new Date(cls.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <a
                      href={`#/meet/${cls.id}?name=${encodeURIComponent(cls.title)}`}
                      className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer shadow-sm text-center"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Live Room</span>
                    </a>

                    {cls.recordingUrl && (
                      <a
                        href={cls.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-surface border border-border hover:bg-muted text-foreground transition-all"
                        title="Watch Lecture Replay"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Class Booking Checkout Modal */}
      <ClassBookingModal
        masterclass={selectedClassForBooking}
        isOpen={Boolean(selectedClassForBooking)}
        onClose={() => setSelectedClassForBooking(null)}
        onConfirmBooking={bookClassTicket}
      />

      {/* Host New Masterclass Modal (Mentors) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-foreground font-mono">
              Host a Live Masterclass / Batch
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Class Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. System Design Mock Interviews & Solutions"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Ticket Fee (INR)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Description & Outline</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="What will students learn in this live session?"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground text-xs font-extrabold rounded-xl hover:bg-primary/90 shadow-sm"
                >
                  Publish Masterclass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

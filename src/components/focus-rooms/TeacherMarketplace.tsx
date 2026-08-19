import React, { useState } from "react";
import { useClasses, Masterclass } from "@/hooks/use-classes";
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

export const TeacherMarketplace: React.FC = () => {
  const { classes, myTickets, bookClassTicket, createMasterclass } = useClasses();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"browse" | "my_tickets">("browse");
  const [selectedClassForBooking, setSelectedClassForBooking] = useState<Masterclass | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Host Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-card to-primary/10 border border-border/80 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Teacher & Masterclass Marketplace</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground font-mono">
            Learn from Verified Mentors & Experts
          </h2>
          <p className="text-xs text-muted-foreground">
            Drop into live masterclasses, book batch tickets, and access exclusive lecture recordings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Host a Masterclass</span>
          </button>
        </div>
      </div>

      {/* Main Filter / Tab Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-border/80 shadow-xs">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "browse" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Browse Masterclasses ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab("my_tickets")}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "my_tickets" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>My Enrolled Tickets</span>
            <span className="text-[10px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full">
              {enrolledClasses.length}
            </span>
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
                    <button
                      onClick={() => toast.success(`Entering live Focus Room for "${cls.title}"! 🎯`)}
                      className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Live Room</span>
                    </button>

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

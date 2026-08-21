import React, { useState } from "react";
import { useGroups } from "@/hooks/use-groups";
import { useChannels } from "@/hooks/use-channels";
import { useHabits } from "@/hooks/use-habits";
import { MemberList } from "./MemberList";
import { ChannelChat } from "./ChannelChat";
import { CreateGroupModal } from "./CreateGroupModal";
import { FocusRoomTutorial } from "./FocusRoomTutorial";
import { AddGroupHabitModal } from "./AddGroupHabitModal";
import { FocusRoomStudio } from "./FocusRoomStudio";
import { TeacherMarketplace } from "./TeacherMarketplace";
import {
  Hash,
  Plus,
  Users,
  Copy,
  BookOpen,
  HelpCircle,
  GraduationCap,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
  Menu,
  X,
  MoreVertical,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

export const GroupView: React.FC = () => {
  const {
    groups,
    activeGroup,
    activeGroupId,
    setActiveGroupId,
    members,
    createGroup,
    joinGroup,
    leaveGroup,
    loadSampleSquad,
    toggleStudyingStatus,
    nudgeMember,
  } = useGroups();

  const {
    channels,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    messages,
    createChannel,
    sendMessage,
    togglePinMessage,
  } = useChannels(activeGroupId);

  const { addHabit } = useHabits();

  const [mode, setMode] = useState<"squads" | "marketplace">("squads");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddHabitModalOpen, setIsAddHabitModalOpen] = useState(false);
  const [showTutorialManual, setShowTutorialManual] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [isStudyingInRoom, setIsStudyingInRoom] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    createChannel(newChannelName);
    setNewChannelName("");
    setIsAddingChannel(false);
  };

  const handleCopyInviteCode = () => {
    if (!activeGroup) return;
    navigator.clipboard.writeText(activeGroup.inviteCode);
    toast.success(`Invite Code "${activeGroup.inviteCode}" copied to clipboard! 📋`, {
      description: "Share this code with your classmates or study partners.",
    });
    setShowOverflowMenu(false);
  };

  const handleToggleFocusRoom = () => {
    const nextState = !isStudyingInRoom;
    setIsStudyingInRoom(nextState);
    toggleStudyingStatus(activeGroupId, nextState);
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    await leaveGroup(activeGroupId);
    setShowLeaveConfirm(false);
    setShowOverflowMenu(false);
  };

  const activeStudyingCount = members.filter((m) => m.isStudying).length;

  // ─── Tutorial / Empty State ───
  if (mode === "squads" && (groups.length === 0 || showTutorialManual)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/80 rounded-2xl">
            <button
              onClick={() => setMode("squads")}
              className="px-4 py-1.5 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              📚 Study Squads
            </button>
            <button
              onClick={() => setMode("marketplace")}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mentor Masterclasses</span>
            </button>
          </div>
          {showTutorialManual && (
            <button
              onClick={() => setShowTutorialManual(false)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              ← Back to Active Squads
            </button>
          )}
        </div>

        <FocusRoomTutorial
          onCreateGroup={() => {
            setShowTutorialManual(false);
            setIsCreateModalOpen(true);
          }}
          onJoinWithCode={async (code) => {
            const res = await joinGroup(code);
            if (res.success) {
              setShowTutorialManual(false);
            } else {
              toast.error(res.error || "Could not join group");
            }
          }}
          onLoadSample={() => {
            loadSampleSquad();
            setShowTutorialManual(false);
          }}
        />

        <CreateGroupModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={createGroup}
        />
      </div>
    );
  }

  if (mode === "marketplace") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/80 rounded-2xl shadow-xs">
            <button
              onClick={() => setMode("squads")}
              className="px-4 py-1.5 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground cursor-pointer"
            >
              📚 Study Squads ({groups.length})
            </button>
            <button
              onClick={() => setMode("marketplace")}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm cursor-pointer flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mentor Masterclasses</span>
            </button>
          </div>
        </div>
        <TeacherMarketplace />
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="p-8 text-center bg-card border border-border/80 rounded-3xl">
        <h3 className="text-lg font-bold text-foreground">No active group selected</h3>
        <button
          onClick={() => setShowTutorialManual(true)}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
        >
          Open Tutorial & Guide
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[600px]">
      {/* ─── Top Mode Switcher ─── */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/80 rounded-2xl shadow-xs">
          <button
            onClick={() => setMode("squads")}
            className="px-4 py-1.5 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-sm cursor-pointer"
          >
            📚 Study Squads ({groups.length})
          </button>
          <button
            onClick={() => setMode("marketplace")}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Masterclasses</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTutorialManual(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </div>

      {/* ─── Main Layout: Sidebar + Chat + Members ─── */}
      <div className="flex flex-1 min-h-0 gap-0 rounded-2xl overflow-hidden border border-border/60 shadow-xl bg-card/40 backdrop-blur-xl">

        {/* ── Mobile Sidebar Toggle ── */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden absolute top-3 left-3 z-20 p-2 rounded-xl bg-surface border border-border/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* ── Left Sidebar: Groups + Channels ── */}
        <div
          className={`${
            showSidebar ? "flex" : "hidden lg:flex"
          } flex-col w-full lg:w-[220px] xl:w-[240px] flex-shrink-0 bg-card/80 border-r border-border/50 transition-all duration-200`}
        >
          {/* Group Icons Strip */}
          <div className="flex items-center gap-1.5 p-2 border-b border-border/40 overflow-x-auto flex-shrink-0">
            {groups.map((g) => {
              const isActive = g.id === activeGroupId;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGroupId(g.id);
                    if (window.innerWidth < 1024) setShowSidebar(false);
                  }}
                  title={g.name}
                  className={`relative w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 transition-all cursor-pointer border ${
                    isActive
                      ? "bg-primary/20 border-primary shadow-md ring-2 ring-primary/30 scale-105"
                      : "bg-surface/60 border-border/40 hover:bg-surface hover:border-primary/30 hover:scale-105"
                  }`}
                >
                  {g.avatarEmoji || "📚"}
                  {isActive && (
                    <div className="absolute -left-0.5 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-muted-foreground border-2 border-dashed border-border/60 hover:border-primary/60 hover:text-primary transition-all cursor-pointer flex-shrink-0"
              title="Create New Group"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Group Info Header */}
          <div className="p-3 border-b border-border/40 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-black text-foreground truncate max-w-[150px]">
                {activeGroup.name}
              </h2>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{activeGroup.studyTopic}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                <span>{members.length}</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{activeStudyingCount} studying</span>
              </span>
              <span className="ml-auto text-[9px] font-mono font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                {activeGroup.inviteCode}
              </span>
            </div>
          </div>

          {/* Channels List */}
          <div className="flex-1 flex flex-col p-2 overflow-hidden min-h-0">
            <div className="flex items-center justify-between px-1 mb-1 flex-shrink-0">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-muted-foreground">
                Channels
              </span>
              <button
                onClick={() => setIsAddingChannel(!isAddingChannel)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                title="Create new channel"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {isAddingChannel && (
              <form onSubmit={handleCreateChannelSubmit} className="flex gap-1 mb-2 animate-in fade-in">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="channel-name"
                  className="flex-1 px-2 py-1 bg-surface border border-primary/40 rounded-lg text-[11px] font-mono text-foreground placeholder:text-muted-foreground/60 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  Add
                </button>
              </form>
            )}

            <div className="flex-1 space-y-0.5 overflow-y-auto">
              {channels.map((ch) => {
                const isActive = ch.id === activeChannelId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannelId(ch.id);
                      if (window.innerWidth < 1024) setShowSidebar(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-extrabold"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/80"
                    }`}
                  >
                    {ch.type === "resources" ? (
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Join via Code */}
            <div className="pt-2 mt-auto border-t border-border/40 flex-shrink-0">
              <JoinCodeInput onJoinGroup={joinGroup} />
            </div>
          </div>
        </div>

        {/* ── Center: Channel Header + Chat / Focus Studio ── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Channel Header Bar (hidden when already connected inside Studio to avoid redundant double headers) */}
          {!isStudyingInRoom && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-card/60 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                  title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                >
                  {showSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </button>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs min-w-0">
                  <span className="text-muted-foreground font-semibold truncate max-w-[100px]">
                    {activeGroup.avatarEmoji} {activeGroup.name}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                  <span className="font-bold text-foreground flex items-center gap-1 truncate">
                    {activeChannel?.type === "resources" ? (
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    {activeChannel?.name || "Select channel"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Focus Room Button */}
                <button
                  onClick={handleToggleFocusRoom}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer bg-gradient-to-r from-emerald-500/90 to-primary text-white hover:opacity-95 shadow-sm"
                >
                  <span>📞</span>
                  <span className="hidden sm:inline">Focus Room</span>
                </button>

                {/* Members Toggle */}
                <button
                  onClick={() => setShowMembersPanel(!showMembersPanel)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer border ${
                    showMembersPanel
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-surface/60 text-muted-foreground border-border/50 hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{members.length}</span>
                  {activeStudyingCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* Overflow Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showOverflowMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowOverflowMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border/80 rounded-2xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={handleCopyInviteCode}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-foreground hover:bg-surface flex items-center gap-2.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Copy Invite Code</span>
                          <span className="ml-auto text-[10px] font-mono text-primary font-extrabold">{activeGroup.inviteCode}</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsAddHabitModalOpen(true);
                            setShowOverflowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-foreground hover:bg-surface flex items-center gap-2.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Add Study Habit</span>
                        </button>
                        <div className="my-1 border-t border-border/40" />
                        <button
                          onClick={() => {
                            setShowLeaveConfirm(true);
                            setShowOverflowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Leave Group</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 min-h-0">
            {isStudyingInRoom ? (
              <FocusRoomStudio
                groupId={activeGroupId}
                groupName={activeGroup.name}
                onClose={() => setIsStudyingInRoom(false)}
              />
            ) : activeChannel ? (
              <ChannelChat
                channel={activeChannel}
                messages={messages}
                onSendMessage={sendMessage}
                onTogglePin={togglePinMessage}
                onJoinFocusRoom={handleToggleFocusRoom}
                isStudyingInRoom={isStudyingInRoom}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Select a channel to start chatting</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Members (Collapsible) ── */}
        {showMembersPanel && (
          <div className="w-[220px] xl:w-[240px] flex-shrink-0 bg-card/80 border-l border-border/50 overflow-hidden animate-in slide-in-from-right-2 duration-200">
            <MemberList
              members={members}
              onNudge={nudgeMember}
              onClose={() => setShowMembersPanel(false)}
            />
          </div>
        )}
      </div>

      {/* ─── Leave Group Confirmation Dialog ─── */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border/80 rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-xl">
                {activeGroup.avatarEmoji}
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground">Leave Group?</h3>
                <p className="text-[11px] text-muted-foreground font-medium">{activeGroup.name}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-1">
              You will be removed from this group and lose access to all channels and messages.
            </p>

            {members.length <= 1 && (
              <p className="text-[11px] text-amber-400 font-bold bg-amber-400/10 px-3 py-2 rounded-xl mb-3 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                You're the last member — the group will be deleted.
              </p>
            )}

            {members.length > 1 && members.find((m) => m.userId === activeGroup.createdBy)?.userId === (activeGroup.createdBy) && (
              <p className="text-[11px] text-blue-400 font-bold bg-blue-400/10 px-3 py-2 rounded-xl mb-3 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                As the host, another member will be promoted to admin.
              </p>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 py-2 text-xs font-bold rounded-xl bg-surface border border-border/80 text-foreground hover:bg-surface/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveGroup}
                className="flex-1 px-4 py-2 text-xs font-black rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createGroup}
      />

      {activeGroup && (
        <AddGroupHabitModal
          isOpen={isAddHabitModalOpen}
          onClose={() => setIsAddHabitModalOpen(false)}
          groupName={activeGroup.name}
          onAddHabit={addHabit}
        />
      )}
    </div>
  );
};

// ── Inline Join Code Input ──
const JoinCodeInput: React.FC<{
  onJoinGroup: (code: string) => Promise<{ success: boolean; error?: string }>;
}> = ({ onJoinGroup }) => {
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError(null);
    const res = await onJoinGroup(joinCode);
    setJoinLoading(false);
    if (res.success) {
      setJoinCode("");
    } else {
      setJoinError(res.error || "Failed to join group");
    }
  };

  return (
    <>
      <form onSubmit={handleJoin} className="relative">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.toUpperCase());
            setJoinError(null);
          }}
          placeholder="Invite Code..."
          maxLength={8}
          className="w-full pl-3 pr-14 py-1.5 bg-surface/80 border border-border/80 rounded-xl text-[11px] font-mono font-bold tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary uppercase"
        />
        <button
          type="submit"
          disabled={joinLoading || !joinCode.trim()}
          className="absolute right-1 top-1 bottom-1 px-2.5 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground text-[10px] font-extrabold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
        >
          {joinLoading ? "..." : "Join"}
        </button>
      </form>
      {joinError && (
        <p className="text-[10px] font-bold text-red-400 mt-1 px-1">
          {joinError}
        </p>
      )}
    </>
  );
};

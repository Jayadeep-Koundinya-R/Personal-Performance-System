import React, { useState, useRef, useEffect } from "react";
import { GroupChannel, ChannelMessage } from "@/hooks/use-channels";
import {
  Hash,
  Send,
  Pin,
  Link as LinkIcon,
  Video,
  FileText,
  ExternalLink,
  Sparkles,
  Flame,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

interface ChannelChatProps {
  channel: GroupChannel;
  messages: ChannelMessage[];
  onSendMessage: (content: string, linkUrl?: string) => void;
  onTogglePin: (messageId: string) => void;
  onJoinFocusRoom: () => void;
  isStudyingInRoom: boolean;
}

export const ChannelChat: React.FC<ChannelChatProps> = ({
  channel,
  messages,
  onSendMessage,
  onTogglePin,
  onJoinFocusRoom,
  isStudyingInRoom,
}) => {
  const [inputText, setInputText] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayedMessages = showPinnedOnly
    ? messages.filter((m) => m.pinned)
    : messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showPinnedOnly]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !linkInput.trim()) return;

    onSendMessage(inputText, linkInput.trim() || undefined);
    setInputText("");
    setLinkInput("");
    setShowLinkInput(false);
  };

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-xl">
      {/* Channel Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-card via-surface/60 to-card flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-foreground font-mono">
                {channel.name}
              </h3>
              {channel.type === "resources" && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <BookOpen className="w-2.5 h-2.5" />
                  <span>Notes & Links</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-sm">
              {channel.description || "Active study stream & updates"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pinned Notes */}
          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showPinnedOnly
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-surface border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Pinned Notes ({messages.filter((m) => m.pinned).length})</span>
          </button>

          {/* Drop-in Focus Room Call Button */}
          <button
            onClick={onJoinFocusRoom}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              isStudyingInRoom
                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 animate-pulse"
                : "bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground hover:opacity-90"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isStudyingInRoom ? "In Studio 🟢" : "Studio"}</span>
          </button>

          {/* Dedicated Separate Window Launcher */}
          <button
            onClick={() => {
              const meetUrl = `${window.location.origin}${window.location.pathname}#/meet/${channel.groupId}?name=${encodeURIComponent(channel.name)}`;
              window.open(meetUrl, `PPS_Meet_${channel.groupId}`, "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
              toast.success(`Launched #${channel.name} in a dedicated Meet Window! 🎥`);
            }}
            className="p-1.5 rounded-xl bg-surface border border-border/80 text-muted-foreground hover:text-foreground hover:bg-card transition-all cursor-pointer flex items-center gap-1"
            title="Launch Zoom / Google Meet styled separate window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border/60 flex items-center justify-center text-2xl">
              💬
            </div>
            <h4 className="text-sm font-bold text-foreground">
              {showPinnedOnly ? "No pinned notes yet" : `Welcome to #${channel.name}!`}
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs">
              {showPinnedOnly
                ? "Important formulas, video masterclasses, and lecture notes can be pinned here."
                : "Start the conversation, share study notes, or drop into the focus room together."}
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                msg.pinned
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-surface/50 border-border/60 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{msg.senderAvatar || "👤"}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">
                        {msg.senderName}
                      </span>
                      {msg.senderRole && (
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25">
                          {msg.senderRole}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pin Action */}
                <button
                  onClick={() => onTogglePin(msg.id)}
                  title={msg.pinned ? "Unpin note" : "Pin important note"}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    msg.pinned
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Message Content */}
              <p className="text-xs text-foreground/90 font-medium whitespace-pre-wrap mt-2 leading-relaxed">
                {msg.content}
              </p>

              {/* Link Attachment Card (YouTube / Doc / PDF) */}
              {msg.linkUrl && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                      {msg.linkUrl.includes("youtube.com") || msg.linkUrl.includes("youtu.be") ? (
                        <Video className="w-4 h-4 text-red-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-foreground truncate">
                        {msg.linkUrl.includes("youtube.com") ? "Recorded Video / Masterclass Link" : "Shared Study Resource / File"}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate block font-mono">
                        {msg.linkUrl}
                      </span>
                    </div>
                  </div>
                  <a
                    href={msg.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-surface text-muted-foreground group-hover:text-foreground hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-border/50 bg-card/80 space-y-2">
        {/* Link Input Tray */}
        {showLinkInput && (
          <div className="flex items-center gap-2 p-2 bg-surface border border-primary/40 rounded-xl animate-in fade-in">
            <LinkIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Paste YouTube lecture, PDF link, or Google Doc URL..."
              className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            <button
              onClick={() => setShowLinkInput(false)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-0.5"
            >
              Cancel
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLinkInput(!showLinkInput)}
            title="Attach a lecture recording or study link"
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex-shrink-0 ${
              showLinkInput || linkInput
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-surface border-border/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message #${channel.name}...`}
            className="flex-1 bg-surface border border-border/80 text-xs font-semibold rounded-xl px-4 py-2.5 outline-none text-foreground placeholder:text-muted-foreground/60 focus:border-primary"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && !linkInput.trim()}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

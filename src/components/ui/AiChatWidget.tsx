import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "ai", text: "Hey! I'm your AI Performance Coach. Need a quick roast, or a habit check-in?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isLoggedIn } = useAuth();

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  // Don't show widget if not logged in
  if (!isLoggedIn) return null;

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const newMsg: Message = { id: Date.now().toString(), sender: "user", text };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    // TODO: Connect to actual Supabase Edge Function with Gemini
    // For now, simulate network delay and dummy response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "I've analyzed your recent streaks. You're crushing the Dev-Sync goals, but remember to prioritize your morning routine tomorrow!"
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const quickPrompts = ["Roast my streak 🔥", "Did I hit my goals today? 📊", "Give me a deep-work tip 🧠"];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-[350px] max-h-[500px] h-[70vh] bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border/50 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl">
                  🤖
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Performance AI</h3>
                  <p className="text-[10px] text-primary font-mono uppercase tracking-widest">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-surface transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm
                    ${msg.sender === "user" 
                      ? "bg-primary text-primary-foreground rounded-br-sm" 
                      : "bg-surface border border-border/50 text-foreground rounded-bl-sm"}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border/50 bg-background/50">
              {/* Quick Prompts */}
              {messages.length === 1 && (
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                  {quickPrompts.map((prompt, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(prompt)}
                      className="whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-[11px] font-medium text-muted-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex items-center gap-2 relative"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your AI coach..."
                  className="flex-1 bg-surface border border-border rounded-full pl-4 pr-10 py-2.5 text-[13px] outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  ↑
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-xl flex items-center justify-center overflow-hidden relative border border-white/10"
        style={{ boxShadow: "0 10px 25px -5px rgba(99,102,241,0.5)" }}
      >
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjgiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ0cmFuc3BhcmVudCIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjE1Ii8+PC9zdmc+')] mix-blend-overlay" 
        />
        <span className="text-2xl relative z-10 drop-shadow-md">
          {isOpen ? "✕" : "🤖"}
        </span>
      </motion.button>
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { ChevronDown, ChevronRight, Sparkles, Layers } from "lucide-react";

interface TaskSectionProps {
  title: string;
  borderColor: string;
  tasks: any[];
  renderTask: (h: any, i: number) => React.ReactNode;
  emptyText: string;
  renderEmptyList: (t: string) => React.ReactNode;
  initialLimit?: number;
}

export function TaskSection({
  title,
  borderColor,
  tasks,
  renderTask,
  emptyText,
  renderEmptyList,
  initialLimit = 10,
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const hasTasks = tasks.length > 0;

  const visibleTasks = showAll || tasks.length <= initialLimit ? tasks : tasks.slice(0, initialLimit);
  const hiddenCount = Math.max(0, tasks.length - initialLimit);

  return (
    <motion.div
      whileHover={{ borderColor: "hsl(var(--primary) / 0.35)" }}
      className={`bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl border-l-[4px] transition-all shadow-xs overflow-hidden ${borderColor}`}
    >
      {/* Header bar with count and collapse toggle */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer select-none hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground transition-transform">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-primary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary" />
            )}
          </span>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              hasTasks
                ? "bg-primary/10 text-primary border-primary/25 font-black shadow-2xs"
                : "bg-surface text-muted-foreground border-border/60"
            }`}
          >
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Task List or Compact Empty State */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3.5 sm:px-4 pb-3.5 space-y-1.5 border-t border-border/40 pt-2.5"
          >
            {hasTasks ? (
              <>
                {visibleTasks.map((t, i) => renderTask(t, i))}

                {/* Progressive Disclosure: Show more / Show less expander */}
                {tasks.length > initialLimit && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAll(!showAll)}
                      className="text-xs font-mono font-bold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 border border-primary/25 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02] inline-flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {showAll
                          ? "▲ Show top 10 only (fold backlog)"
                          : `▼ Show ${hiddenCount} more tasks in ${title.replace(/^[^a-zA-Z0-9]+/, "")}`}
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-3 px-3 bg-surface/30 border border-dashed border-border/60 rounded-xl text-center">
                <span className="text-[11px] font-mono text-muted-foreground font-medium flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary/70 inline" />
                  <span>{emptyText}</span>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

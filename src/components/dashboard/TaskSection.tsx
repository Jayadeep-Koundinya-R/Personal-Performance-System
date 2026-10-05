import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TaskSectionProps {
  title: string;
  borderColor: string;
  tasks: any[];
  renderTask: (h: any, i: number) => React.ReactNode;
  emptyText: string;
  renderEmptyList: (t: string) => React.ReactNode;
}

export function TaskSection({
  title,
  borderColor,
  tasks,
  renderTask,
  emptyText,
  renderEmptyList,
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const hasTasks = tasks.length > 0;

  return (
    <motion.div
      whileHover={{ borderColor: "hsl(var(--primary) / 0.3)" }}
      className={`bg-card border border-border rounded-2xl border-l-[4px] transition-all shadow-xs overflow-hidden ${borderColor}`}
    >
      {/* Header bar with count and collapse toggle */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer select-none hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-transform">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              hasTasks
                ? "bg-primary/10 text-primary border-primary/25 font-black"
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
              tasks.map((t, i) => renderTask(t, i))
            ) : (
              <div className="py-2.5 px-3 bg-surface/30 border border-dashed border-border/60 rounded-xl text-center">
                <span className="text-[11px] font-mono text-muted-foreground font-medium flex items-center justify-center gap-1.5">
                  <span>✨</span>
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

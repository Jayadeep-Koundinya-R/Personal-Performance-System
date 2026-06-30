import { motion } from "framer-motion";
import * as React from "react";

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
  return (
    <motion.div
      whileHover={{ borderColor: "hsl(var(--primary) / 0.3)" }}
      className={`bg-card border border-border p-5 rounded-xl border-l-[3px] ${borderColor}`}
    >
      <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5 flex items-center gap-2">
        {title}
      </h3>
      {tasks.length > 0 ? tasks.map((t, i) => renderTask(t, i)) : renderEmptyList(emptyText)}
    </motion.div>
  );
}

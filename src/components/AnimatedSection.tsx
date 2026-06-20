/*
  💡 REACT LESSON: Animation Wrapper
  This wraps any section content with a fade-in + slide-up animation
  using framer-motion. When you switch sections in the dashboard,
  the content animates in smoothly instead of popping in instantly.
*/

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  sectionKey: string;
}

const AnimatedSection = ({ children, sectionKey }: AnimatedSectionProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={sectionKey}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedSection;

import { AnimatePresence, motion } from "framer-motion";

interface CountdownProps {
  value: number | null;
}

export function Countdown({ value }: CountdownProps) {
  if (value === null) return null;

  return (
    <div className="flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          className="text-[120px] font-bold text-[var(--accent)] tabular-nums select-none"
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

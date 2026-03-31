import { AnimatePresence, motion } from "framer-motion";

interface TapFeedbackProps {
  taps: number[];
}

export function TapFeedback({ taps }: TapFeedbackProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {taps.map((id) => (
          <motion.div
            key={id}
            className="absolute rounded-full border-2 border-[var(--accent)] w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] lg:w-[180px] lg:h-[180px]"
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

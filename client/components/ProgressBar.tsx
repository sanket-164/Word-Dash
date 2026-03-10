"use client";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

function ProgressBar({
  className,
  value,
  showRunner = true,
  runnerColor = "🏃",
}: {
  className?: string;
  value: number;
  showRunner?: boolean;
  runnerColor?: string;
}) {
  // Clamp value between 0-100
  const progress = Math.min(100, Math.max(0, value));
  const [lastValue, setLastValue] = useState(value);
  const [runDirection, setRunDirection] = useState(-1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastValue(value);
    setRunDirection(value >= lastValue ? -1 : 1);
  }, [value]);

  return (
    <div className="relative w-full h-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden shadow-inner">
      {/* Track lines for running effect */}
      <div className="absolute inset-0 flex items-center px-2 opacity-30">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
      </div>

      {/* Progress fill with smooth gradient */}
      <motion.div
        className={cn(
          "absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300 ease-out",
          className,
        )}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />

      {/* Animated runner character */}
      {showRunner && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 text-lg pointer-events-none z-10"
          initial={{ left: "0%" }}
          animate={{ left: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
        >
          <motion.span
            animate={{
              y: [0, -3, 0],
              rotate: [0, -5, 5, -5, 0],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="inline-block"
            style={{ scaleX: runDirection }}
          >
            {runnerColor}
          </motion.span>
        </motion.div>
      )}

      {/* Finish line flag */}
      {progress >= 90 && (
        <motion.div
          className="absolute right-1 top-1/2 -translate-y-1/2 text-sm"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          🏁
        </motion.div>
      )}
    </div>
  );
}

export default ProgressBar;

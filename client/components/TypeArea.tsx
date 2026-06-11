"use client";
import { useState, useRef, useEffect } from "react";
import ProgressBar from "./ProgressBar";
import { motion } from "framer-motion";

const TypeArea = ({
  text,
  enemyProgress,
  sendProgress,
  playerName = "You",
  enemyName = "Opponent",
}: {
  text: string;
  enemyProgress: number;
  sendProgress: (textLength: number) => void;
  playerName?: string;
  enemyName?: string;
}) => {
  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const [correctLetters, setCorrectLetters] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus the container when the component mounts
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle backspace (including Ctrl/Cmd + Backspace for word deletion)
    if (e.key === "Backspace") {
      let newText = "";
      if (e.ctrlKey || e.metaKey) {
        if (inputText.length === 0) {
          newText = "";
        } else if (/\s$/.test(inputText)) {
          // If ends with space(s), remove all trailing spaces
          newText = inputText.replace(/\s+$/, "");
        } else {
          // Otherwise, remove the last word
          newText = inputText.replace(/\S+$/, "");
        }
      } else {
        newText = inputText.slice(0, -1);
      }

      setInputText(newText);
      if (text.startsWith(newText)) {
        setCorrectLetters(newText.length);
        sendProgress(newText.length);
        setIsError(false);
      } else {
        setIsError(true);
      }
      return;
    }

    // Ignore non-character keys and combinations with ctrl/alt/meta for typing
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length !== 1) return;

    // Stop if already completed the text
    if (inputText.length >= text.length) return;

    const newTypedText = inputText + e.key;
    if (newTypedText.length > text.length) return;

    // Start timer on first character
    if (!startTimeRef.current && newTypedText.length === 1) {
      startTimeRef.current = Date.now();
    }

    setInputText(newTypedText);

    if (text.startsWith(newTypedText)) {
      sendProgress(newTypedText.length);
      setCorrectLetters(newTypedText.length);
      setIsError(false);
    } else {
      setIsError(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl space-y-6"
    >
      {/* Player Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-600">
          <span>{playerName}</span>
          <span className="text-blue-600">
            {correctLetters}/{text.length} chars
          </span>
        </div>
        <ProgressBar
          value={(correctLetters / text.length) * 100}
          runnerColor="🏃🏻‍♂️"
        />
      </div>

      {/* Enemy Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-600">
          <span>{enemyName}</span>
          <span className="text-red-500">
            {enemyProgress}/{text.length} chars
          </span>
        </div>
        <ProgressBar
          value={(enemyProgress / text.length) * 100}
          className="from-red-400 to-red-600"
          runnerColor="🏃🏽"
        />
      </div>

      {/* Text Display & Interaction Area */}
      <motion.div
        ref={containerRef}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className="relative p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-blue-200 cursor-text"
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <p className="text-2xl md:text-3xl font-mono leading-relaxed text-gray-800">
          {text.split("").map((char, index) => {
            let className = "transition-colors duration-100 ";
            const isTyped = index < inputText.length;
            const isCorrect = index < correctLetters;
            const isCurrent = index === inputText.length;

            if (isCorrect) {
              className += "text-green-600 font-semibold";
            } else if (isTyped && isError) {
              // Show the actually typed character in red if it's wrong
              className += "text-red-500 bg-red-100";
            } else if (isCurrent && isFocused) {
              // Show cursor on the next character to type
              className += "text-blue-600 border-b-2 border-blue-400";
            } else {
              className += "text-gray-400";
            }
            return (
              <span key={index} className={className}>
                {char}
              </span>
            );
          })}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default TypeArea;

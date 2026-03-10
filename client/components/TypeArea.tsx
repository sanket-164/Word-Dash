"use client";
import { useState, useRef } from "react";
import ProgressBar from "./ProgressBar";
import { motion } from "framer-motion";

const TypeArea = ({
  text,
  enemyProgress,
  onChange,
  playerName = "You",
  enemyName = "Opponent",
}: {
  text: string;
  enemyProgress: number;
  onChange: (text: string) => void;
  playerName?: string;
  enemyName?: string;
}) => {
  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const [correctLetters, setCorrectLetters] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const handleChange = (typedText: string) => {
    if (typedText.length > text.length) return;

    // start timer when user types first character
    if (!startTimeRef.current && typedText.length === 1) {
      startTimeRef.current = Date.now();
    }

    setInputText(typedText);

    if (text.startsWith(typedText)) {
      setCorrectLetters(typedText.length);
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

      {/* Text Display */}
      <motion.div
        className="relative p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm"
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <p className="text-2xl md:text-3xl font-mono leading-relaxed text-gray-800">
          {text.split("").map((char, index) => {
            let className = "transition-colors duration-100 ";
            if (index < correctLetters) {
              className += "text-green-600 font-semibold";
            } else if (index <= inputText.length && isError) {
              className += "text-red-500 bg-red-100";
            } else if (index <= inputText.length && isFocused) {
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

      {/* Input Area */}
      <div className="relative">
        <textarea
          className={`w-full p-4 text-xl font-mono rounded-xl border-2 outline-none transition-all duration-200 resize-none
            ${
              isError
                ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : correctLetters === text.length
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            }`}
          placeholder="Start typing to race..."
          value={inputText}
          onChange={(e) => {
            handleChange(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={correctLetters === text.length}
          rows={3}
          autoFocus
        />
      </div>
    </motion.div>
  );
};

export default TypeArea;

"use client";
import { useState } from "react";

const TypeArea = () => {
  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const RANDOM_TEXT = "The quick brown fox jumps over the lazy dog.";

  const checkInputText = (text: string) => {
    if (text.length > RANDOM_TEXT.length) {
      return;
    }

    if (RANDOM_TEXT.startsWith(text)) {
      setInputText(text);
      setIsError(false);
    } else {
      setIsError(true);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <textarea className="text-lg" value={RANDOM_TEXT} disabled />
      <textarea
        className={`text-lg rounded-md px-3 py-2 outline-none ring transition-colors focus-visible:ring-[3px] focus-visible:
          ${
            inputText
              ? isError
                ? "ring-red-500"
                : "ring-green-500"
              : "ring-white"
          }
          `}
        placeholder="Start Typing..."
        value={inputText}
        onChange={(e) => checkInputText(e.target.value)}
      />
    </div>
  );
};

export default TypeArea;

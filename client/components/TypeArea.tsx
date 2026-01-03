"use client";
import { useState } from "react";
import ProgressBar from "./ProgressBar";

const TypeArea = ({
  text,
  enemyProgress,
  onChange,
}: {
  text: string;
  enemyProgress: number;
  onChange: (text: string) => void;
}) => {
  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const [correctLetters, setCorrectLetters] = useState<number>(0);

  const handleChange = (typedText: string) => {
    if (typedText.length > text.length) {
      return;
    }

    setInputText(typedText);

    if (text.startsWith(typedText)) {
      setCorrectLetters(typedText.length);
      setIsError(false);
      return;
    }

    setIsError(true);
  };

  return (
    <div>
      <div className="flex flex-col mb-4 space-y-4">
        <ProgressBar value={(correctLetters / text.length) * 100} />
        <ProgressBar
          value={(enemyProgress / text.length) * 100}
          className="bg-red-500"
        />
      </div>
      <div className="flex flex-col space-y-2">
        <p className="text-3xl">{text}</p>
        <textarea
          className={`text-3xl rounded-md px-3 py-2 outline-none ring transition-colors
        ${
          inputText
            ? isError
              ? "ring-red-500"
              : "ring-green-500"
            : "ring-white"
        }`}
          placeholder="Start Typing..."
          value={inputText}
          onChange={(e) => {
            handleChange(e.target.value);
            onChange(e.target.value);
          }}
        />
      </div>
    </div>
  );
};

export default TypeArea;

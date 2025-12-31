"use client";
import { useState } from "react";
import { Textarea } from "./ui/textarea";

const TypeArea = () => {
  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const RANDOM_TEXT = "The quick brown fox jumps over the lazy dog.";
  const SUCCESS_COLOR = "#22C55E";
  const ERROR_COLOR = "#EF4444";

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
    <div>
      <Textarea className="mb-2" value={RANDOM_TEXT} disabled />
      <Textarea
        placeholder="Start Typing..."
        value={inputText}
        onChange={(e) => checkInputText(e.target.value)}
        style={{
          background: inputText ? (isError ? ERROR_COLOR : SUCCESS_COLOR) : "",
        }}
      />
    </div>
  );
};

export default TypeArea;

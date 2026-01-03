"use client";
import TopBar from "@/components/TopBar";
import { useState, useRef, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const socketRef: React.RefObject<WebSocket | null> = useRef(null);
  const [messages, setMessages] = useState<Array<string>>([]);

  const [start, setStart] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const RANDOM_TEXT = "The quick brown fox jumps over the lazy dog.";

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/ws");
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      if (event.data === "GAME_START") {
        setLoading(false);
        return;
      }
      setMessages((prev) => [...prev, event.data]);
      console.log("Message from server ", event.data);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  const joinRandomRoom = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(`RANDOM_ROOM`);
    }
  };

  const sendMessage = (message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(`MESSAGE:${message}`);
    }
  };

  const initializeGame = () => {
    joinRandomRoom();
    setStart(true);
    setLoading(true);
  };

  const checkInputText = (text: string) => {
    if (text.length > RANDOM_TEXT.length) {
      return;
    }

    if (RANDOM_TEXT.startsWith(text)) {
      setInputText(text);
      setIsError(false);
      sendMessage(text.length.toString());
    } else {
      setIsError(true);
    }
  };

  return (
    <div>
      <TopBar />
      <div className="container mx-auto p-4">
        {!start && <button onClick={initializeGame}>Start Game</button>}
        {start && loading && (
          <div className="flex justify-center items-center">
            <Spinner />
          </div>
        )}
        {start && !loading && (
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
        )}
      </div>
    </div>
  );
}

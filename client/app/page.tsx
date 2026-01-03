"use client";
import TopBar from "@/components/TopBar";
import { useState, useRef, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import ProgressBar from "@/components/ProgressBar";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const socketRef: React.RefObject<WebSocket | null> = useRef(null);
  const [enemyLetters, setEnemyLetters] = useState<number>(0);
  const [start, setStart] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [randomText, setRandomText] = useState(
    "Random text will appear here once connected to a room."
  );

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/ws");
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      if (event.data.startsWith("RANDOM_TEXT:")) {
        const text = event.data.replace("RANDOM_TEXT:", "");
        setRandomText(text);
        setLoading(false);
        return;
      }

      setEnemyLetters(parseInt(event.data));
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
    if (text.length > randomText.length) {
      return;
    }

    if (randomText.startsWith(text)) {
      setInputText(text);
      setIsError(false);
      sendMessage(text.length.toString());
    } else {
      setIsError(true);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar />

      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        {!start && (
          <button
            onClick={initializeGame}
            className="h-10 w-32 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-lg"
          >
            Start Game
          </button>
        )}

        {start && loading && (
          <div className="flex flex-col items-center space-y-2">
            <Spinner className="h-16 w-16 text-blue-500" />
            <p>Searching...</p>
          </div>
        )}

        {start && !loading && (
          <div className="container mx-auto p-4">
            <div className="flex flex-col mb-4 space-y-4">
              <ProgressBar
                value={(inputText.length / randomText.length) * 100}
              />
              <ProgressBar
                value={(enemyLetters / randomText.length) * 100}
                className="bg-red-500"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <p className="text-xl">{randomText}</p>
              <textarea
                className={`text-lg rounded-md px-3 py-2 outline-none ring transition-colors
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
          </div>
        )}
      </div>
    </div>
  );
}

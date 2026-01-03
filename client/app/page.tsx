"use client";
import TopBar from "@/components/TopBar";
import { useState, useRef, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import ProgressBar from "@/components/ProgressBar";
import TypeArea from "@/components/TypeArea";

export default function Home() {
  const socketRef: React.RefObject<WebSocket | null> = useRef(null);

  const [inputText, setInputText] = useState("");
  const [isError, setIsError] = useState(false);
  const [enemyLetters, setEnemyLetters] = useState<number>(0);
  const [start, setStart] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [winner, setWinner] = useState<string>("");
  const [correctLetters, setCorrectLetters] = useState<number>(0);

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

      if (event.data.startsWith("WINNER:")) {
        const winnerName = event.data.replace("WINNER:", "");
        setWinner(winnerName);
        return;
      }

      if (event.data.startsWith("ERROR:")) {
        const errorMessage = event.data.replace("ERROR:", "");
        alert(`Error from server: ${errorMessage}`);
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
      socketRef.current.send(message);
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

    setInputText(text);

    if (randomText.startsWith(text)) {
      setCorrectLetters(text.length);
      setIsError(false);
      sendMessage(`PROGRESS:${text.length.toString()}`);

      if (text === randomText) {
        sendMessage(`BROADCAST:WINNER:${userName}`);
      }

      return;
    }

    setIsError(true);
  };

  return (
    <div className="min-h-screen">
      <TopBar />

      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        {!start && (
          <div className="flex flex-col items-center space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="mb-4 px-3 py-2 border border-gray-300 rounded-md text-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={initializeGame}
              className="h-10 w-32 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-lg"
            >
              Start Game
            </button>
          </div>
        )}

        {start && loading && (
          <div className="flex flex-col items-center space-y-2">
            <Spinner className="h-16 w-16 text-blue-500" />
            <p>Searching...</p>
          </div>
        )}

        {start && !loading && (
          <div className="container mx-auto p-4">
            {winner && (
              <div
                className={`mb-4 p-4 ${
                  winner === userName
                    ? "bg-green-200 text-green-800"
                    : "bg-red-200 text-red-800"
                } rounded-md text-center text-xl font-semibold`}
              >
                {winner} has won the game!
              </div>
            )}
            <div className="flex flex-col mb-4 space-y-4">
              <ProgressBar value={(correctLetters / randomText.length) * 100} />
              <ProgressBar
                value={(enemyLetters / randomText.length) * 100}
                className="bg-red-500"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <p className="text-3xl">{randomText}</p>
              <TypeArea
                className={`text-3xl ${
                  inputText
                    ? isError
                      ? "ring-red-500"
                      : "ring-green-500"
                    : "ring-white"
                }`}
                inputText={inputText}
                checkInputText={checkInputText}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import TypeArea from "@/components/TypeArea";
import {
  connectWebSocket,
  sendMessage,
  addMessageListener,
} from "../../lib/websocket";

export default function RandomDashPage() {
  const [start, setStart] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [enemyLetters, setEnemyLetters] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [winner, setWinner] = useState<string>("");

  const [randomText, setRandomText] = useState(
    "Random text will appear here once connected to a room.",
  );

  useEffect(() => {
    const removeListener = addMessageListener((data) => {
      const message = data;
      if (message.startsWith("RANDOM_TEXT:")) {
        const text = message.replace("RANDOM_TEXT:", "");
        setRandomText(text);
        setLoading(false);
        return;
      }

      if (message.startsWith("WINNER:")) {
        const winnerName = message.replace("WINNER:", "");
        setWinner(winnerName);
        return;
      }

      if (message.startsWith("ERROR:")) {
        const errorMessage = message.replace("ERROR:", "");
        alert(`Error from server: ${errorMessage}`);
        return;
      }

      setEnemyLetters(parseInt(message));
      console.log("Message from server ", message);
    });

    return removeListener;
  }, []);

  const startGame = () => {
    if (!userName) {
      alert("Please enter your name to start the game.");
      return;
    }
    setStart(true);
    setLoading(true);
    sendMessage("RANDOM_ROOM");
  };

  const checkInputText = (text: string) => {
    if (text.length > randomText.length) {
      return;
    }

    if (randomText.startsWith(text)) {
      sendMessage(`PROGRESS:${text.length.toString()}`);

      if (text === randomText) {
        sendMessage(`BROADCAST:WINNER:${userName}`);
      }

      return;
    }
  };

  return (
    <div className="container mx-auto p-4">
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
              onClick={startGame}
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

        {start && !loading && (
          <TypeArea
            text={randomText}
            enemyProgress={enemyLetters}
            onChange={checkInputText}
          />
        )}
      </div>
    </div>
  );
}

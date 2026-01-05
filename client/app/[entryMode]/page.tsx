"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import TypeArea from "@/components/TypeArea";
import {
  connectWebSocket,
  sendMessage,
  addMessageListener,
} from "../../lib/websocket";

export default function DashPage() {
  const [start, setStart] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [enemyLetters, setEnemyLetters] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [winner, setWinner] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const params = useParams<{ entryMode: string }>();

  const [randomText, setRandomText] = useState(
    "Random text will appear here once connected to a room."
  );

  useEffect(() => {
    connectWebSocket("ws://localhost:8080/ws");

    const removeListener = addMessageListener((data) => {
      const message = data;
      console.log("Message from server ", message);

      if (message.startsWith("ROOM:")) {
        const roomName = message.replace("ROOM:", "");
        setRoom(roomName);
        return;
      }

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

    switch (params.entryMode) {
      case "random":
        if (room) {
          alert("Room name should be empty for random games.");
          setStart(false);
          setLoading(false);
        }
        sendMessage("RANDOM_ROOM");
        break;
      case "create":
        if (!room) {
          alert("Please enter a room name to create a private game.");
          setStart(false);
          setLoading(false);
        }
        sendMessage(`CREATE_ROOM:${room}`);
        break;
      case "join":
        if (!room) {
          alert("Please enter a room name to join a private game.");
          setStart(false);
          setLoading(false);
        }
        sendMessage(`JOIN_ROOM:${room}`);
        break;
      default:
        alert("Invalid entry mode.");
        setStart(false);
        setLoading(false);
    }
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
            {params.entryMode !== "random" && (
              <input
                type="text"
                placeholder="Room Name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="mb-4 px-3 py-2 border border-gray-300 rounded-md text-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <input
              type="text"
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="mb-4 px-3 py-2 border border-gray-300 rounded-md text-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={startGame}
              className="h-10 w-32 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-lg"
            >
              {params.entryMode === "random"
                ? "Start"
                : params.entryMode === "create"
                ? "Create"
                : "Join"}{" "}
              Game
            </button>
          </div>
        )}

        {start && loading && (
          <div className="flex flex-col items-center space-y-2">
            <Spinner className="h-16 w-16 text-blue-500" />
            <p>
              {params.entryMode === "random"
                ? "Searching..."
                : "Waiting for opponent..."}
            </p>
          </div>
        )}

        <div className="flex flex-col items-center space-y-2">
          {start && !loading && !winner && (
            <TypeArea
              text={randomText}
              enemyProgress={enemyLetters}
              onChange={checkInputText}
            />
          )}

          {winner && (
            <>
              <div
                className={`mb-4 p-4 ${
                  winner === userName
                    ? "bg-green-200 text-green-800"
                    : "bg-red-200 text-red-800"
                } rounded-md text-center text-xl font-semibold`}
              >
                {winner} has won the game!
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

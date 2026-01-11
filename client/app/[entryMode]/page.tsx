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

interface ServerMessage {
  type: "ROOM" | "TEXT" | "WINNER" | "ERROR" | "PROGRESS";
  content: string | number;
}

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

      const serverMessage: ServerMessage = JSON.parse(message);

      if (serverMessage.type === "ROOM") {
        setRoom(serverMessage.content as string);
        return;
      }

      if (serverMessage.type === "TEXT") {
        setRandomText(serverMessage.content as string);
        setLoading(false);
        return;
      }

      if (serverMessage.type === "WINNER") {
        setWinner(serverMessage.content as string);
        return;
      }

      if (serverMessage.type === "ERROR") {
        alert(`Error from server: ${serverMessage.content as string}`);
        return;
      }

      if (serverMessage.type === "PROGRESS") {
        setEnemyLetters(serverMessage.content as number);
      }
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
        sendMessage(
          JSON.stringify({
            type: "JOIN",
            room_name: "RANDOM_ROOM",
          })
        );
        break;
      case "create":
        if (!room) {
          alert("Please enter a room name to create a private game.");
          setStart(false);
          setLoading(false);
        }
        sendMessage(
          JSON.stringify({
            type: "CREATE",
            room_name: room,
          })
        );
        break;
      case "join":
        if (!room) {
          alert("Please enter a room name to join a private game.");
          setStart(false);
          setLoading(false);
        }
        sendMessage(
          JSON.stringify({
            type: "JOIN",
            room_name: room,
          })
        );
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
      sendMessage(
        JSON.stringify({
          type: "PROGRESS",
          content: text.length,
        })
      );

      if (text === randomText) {
        sendMessage(
          JSON.stringify({
            type: "WINNER",
            content: userName,
          })
        );
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

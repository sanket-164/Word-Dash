"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import TypeArea from "@/components/TypeArea";
import {
  connectWebSocket,
  sendMessage,
  addMessageListener,
} from "../../lib/websocket";
import {
  GameWinnerClientMessage,
  SendProgressMessage,
  ServerMessage,
} from "../types";

export default function DashPage() {
  const [start, setStart] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [enemyLetters, setEnemyLetters] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [winner, setWinner] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const params = useParams<{ entryMode: string }>();
  const [gamePDA, setGamePDA] = useState("gamePDA");
  const [vaultPDA, setVaultPDA] = useState("vaultPDA");
  const wallet = useWallet();

  const [randomText, setRandomText] = useState(
    "Random text will appear here once connected to a room.",
  );

  useEffect(() => {
    connectWebSocket("ws://localhost:8080/ws");

    const removeListener = addMessageListener(async (data) => {
      const message = data;
      console.log("Message from server ", message);

      const serverMessage: ServerMessage = JSON.parse(message);

      if (serverMessage.type === "NewRoom") {
        const createRoomMessage = JSON.stringify({
          type: "CreateRoom",
          player_name: userName,
          room_name: serverMessage.room_name,
          game_pda: gamePDA,
          vault_pda: vaultPDA,
          pub_key: wallet.publicKey?.toString() || "",
        });
        sendMessage(createRoomMessage);

        return;
      }

      if (serverMessage.type === "AvailableRoom") {
        const joinRoomMessage = JSON.stringify({
          type: "JoinRoom",
          player_name: userName,
          room_name: serverMessage.room_name,
          game_pda: serverMessage.game_pda,
          vault_pda: serverMessage.vault_pda,
          pub_key: wallet.publicKey?.toString() || "",
        });
        sendMessage(joinRoomMessage);
        return;
      }

      if (serverMessage.type === "JoinedRoom") {
        setRoom(serverMessage.room_name);
        setGamePDA(serverMessage.game_pda);
        setVaultPDA(serverMessage.vault_pda);
        return;
      }

      if (serverMessage.type === "OpponentJoined") {
        const startDashMessage = JSON.stringify({
          type: "StartDash",
        });
        sendMessage(startDashMessage);
        return;
      }

      if (serverMessage.type === "Text") {
        setRandomText(serverMessage.content);
        setLoading(false);
        return;
      }

      if (serverMessage.type === "OpponentProgress") {
        setEnemyLetters(serverMessage.progress);
        return;
      }

      if (serverMessage.type === "GameWinner") {
        setWinner(serverMessage.player_name);
        return;
      }

      if (serverMessage.type === "OpponentLeft") {
        const gameWinnerMessage = JSON.stringify({
          type: "GameWinner",
          player_name: userName,
          game_pda: gamePDA,
          vault_pda: vaultPDA,
          pub_key: wallet.publicKey?.toString() || "",
        } as GameWinnerClientMessage);

        sendMessage(gameWinnerMessage);
        return;
      }

      if (serverMessage.type === "Error") {
        console.error("Error from server: ", serverMessage.content);
        alert(serverMessage.content);
        return;
      }
    });

    return removeListener;
  }, [userName]);

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
          return;
        }
        sendMessage(
          JSON.stringify({
            type: "GetRoom",
          }),
        );
        break;
      case "create":
        if (!room) {
          alert("Please enter a room name to create a private game.");
          setStart(false);
          setLoading(false);
          return;
        }
        const createRoomMessage = JSON.stringify({
          type: "CreateRoom",
          player_name: userName,
          room_name: room,
          game_pda: gamePDA,
          vault_pda: vaultPDA,
          pub_key: wallet.publicKey?.toString() || "",
        });
        sendMessage(createRoomMessage);
        break;
      case "join":
        if (!room) {
          alert("Please enter a room name to join a private game.");
          setStart(false);
          setLoading(false);
          return;
        }
        const joinRoomMessage = JSON.stringify({
          type: "JoinRoom",
          player_name: userName,
          room_name: room,
          game_pda: gamePDA,
          vault_pda: vaultPDA,
          pub_key: wallet.publicKey?.toString() || "",
        });
        sendMessage(joinRoomMessage);
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
      const progressMessage = JSON.stringify({
        type: "SendProgress",
        player_name: userName,
        progress: text.length,
      } as SendProgressMessage);

      sendMessage(progressMessage);

      if (text === randomText) {
        const gameWinnerMessage = JSON.stringify({
          type: "GameWinner",
          player_name: userName,
          game_pda: gamePDA,
          vault_pda: vaultPDA,
          pub_key: wallet.publicKey?.toString() || "",
        } as GameWinnerClientMessage);
        sendMessage(gameWinnerMessage);
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

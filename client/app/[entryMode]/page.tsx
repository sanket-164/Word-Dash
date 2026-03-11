"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TypeArea from "@/components/TypeArea";
import Link from "next/link";
import { sendMessage, addMessageListener } from "../../lib/websocket";
import {
  CreateRoomMessage,
  GameWinnerClientMessage,
  GetRoomMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  SendProgressMessage,
  ServerMessage,
  StartDashMessage,
} from "../types";

export default function DashPage() {
  const [start, setStart] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [enemyLetters, setEnemyLetters] = useState<number>(0);
  const [opponentName, setOpponentName] = useState<string>("Opponent");
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
        } as CreateRoomMessage);
        sendMessage(createRoomMessage);

        return;
      }

      if (serverMessage.type === "JoinedRoom") {
        setOpponentName(serverMessage.opponent_name || "Opponent");
        setRoom(serverMessage.room_name);
        setGamePDA(serverMessage.game_pda);
        setVaultPDA(serverMessage.vault_pda);
        return;
      }

      if (serverMessage.type === "OpponentJoined") {
        setOpponentName(serverMessage.player_name);

        const startDashMessage = JSON.stringify({
          type: "StartDash",
        } as StartDashMessage);
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
        const leaveRoomMessage = JSON.stringify({
          type: "LeaveRoom",
          room_name: room,
        } as LeaveRoomMessage);
        sendMessage(leaveRoomMessage);
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
  }, [userName, room, wallet.publicKey, gamePDA, vaultPDA]);

  const startGame = () => {
    if (!userName) {
      alert("Please enter your name to start the game.");
      return;
    }

    setStart(true);
    setLoading(true);

    switch (params.entryMode) {
      case "random":
        setRoom("");
        sendMessage(
          JSON.stringify({
            type: "GetRoom",
            player_name: userName,
          } as GetRoomMessage),
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
        } as CreateRoomMessage);
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
        } as JoinRoomMessage);
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
    <div className="container mx-auto p-4 min-h-[calc(100vh-64px)] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {/* Setup Screen */}
        {!start && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
                <span className="text-3xl">⌨️</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {params.entryMode === "random" && "🎲 Quick Match"}
                {params.entryMode === "create" && "🔐 Create Room"}
                {params.entryMode === "join" && "🚪 Join Room"}
              </h2>
              <p className="text-gray-500 mt-2">
                {params.entryMode === "random" && "Find an opponent instantly"}
                {params.entryMode === "create" && "Set up a private game"}
                {params.entryMode === "join" && "Enter a friend's room code"}
              </p>
            </div>

            <div className="space-y-4">
              {params.entryMode !== "random" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., SPEED-RACE-2024"
                    value={room}
                    onChange={(e) => setRoom(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all uppercase tracking-wider"
                    maxLength={20}
                  />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your display name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  maxLength={16}
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startGame}
                className="w-full mt-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>
                  {params.entryMode === "random"
                    ? "🎲"
                    : params.entryMode === "create"
                      ? "🔐"
                      : "🚪"}
                </span>
                {params.entryMode === "random"
                  ? "Find Match"
                  : params.entryMode === "create"
                    ? "Create Room"
                    : "Join Room"}
              </motion.button>
            </div>

            {/* Wallet hint */}
            {!wallet.connected && (
              <p className="mt-4 text-xs text-center text-gray-400">
                💡 Connect wallet in TopBar to earn rewards
              </p>
            )}
          </motion.div>
        )}

        {/* Loading Screen */}
        {start && loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="inline-block w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full mb-6"
            />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {params.entryMode === "random"
                ? "🔍 Finding opponent..."
                : "⏳ Waiting for player..."}
            </h3>
            <p className="text-gray-500">Get your fingers ready!</p>

            <button
              onClick={() => {
                setStart(false);
                setLoading(false);
              }}
              className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Game Area */}
        {start && !loading && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl"
          >
            {/* Game Component */}
            {!winner ? (
              <TypeArea
                text={randomText}
                enemyProgress={enemyLetters}
                onChange={checkInputText}
                playerName={userName || "You"}
                enemyName={opponentName}
              />
            ) : (
              /* Winner Screen */
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-8 rounded-2xl text-center shadow-xl border-2 ${
                  winner === userName
                    ? "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200"
                    : "bg-gradient-to-br from-red-50 to-rose-100 border-red-200"
                }`}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-6xl mb-4"
                >
                  {winner === userName ? "🏆" : "🥈"}
                </motion.div>
                <h3
                  className={`text-3xl font-bold mb-2 ${
                    winner === userName ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {winner === userName ? "You Won!" : `${winner} Won!`}
                </h3>
                <p className="text-gray-600 mb-6">
                  {winner === userName
                    ? "Amazing typing speed! 🎉"
                    : "Better luck next time! 💪"}
                </p>

                <div className="flex gap-4 justify-center">
                  <Link href="/">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Play Again
                    </motion.button>
                  </Link>
                  <button
                    onClick={() => {
                      setStart(false);
                      setWinner("");
                      setRandomText(
                        "Random text will appear here once connected to a room.",
                      );
                    }}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    New Game
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

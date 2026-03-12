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
import toast from "react-hot-toast";

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
  const [gameReady, setGameReady] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
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

        if (serverMessage.opponent_name) {
          const startDashMessage = JSON.stringify({
            type: "StartDash",
          } as StartDashMessage);
          sendMessage(startDashMessage);
        }

        return;
      }

      if (serverMessage.type === "OpponentJoined") {
        setOpponentName(serverMessage.player_name);
        return;
      }

      if (serverMessage.type === "Text") {
        setRandomText(serverMessage.content);
        setLoading(false);
        setGameReady(true);
        setCountdown(3);
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
        toast.success("Your opponent left the game. You Won!");
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
        console.log("Error from server: ", serverMessage.content);
        toast.error(serverMessage.content);
        setStart(false);
        setLoading(false);
        return;
      }
    });

    return removeListener;
  }, [userName, room, wallet.publicKey, gamePDA, vaultPDA]);

  useEffect(() => {
    if (gameReady && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (gameReady && countdown === 0) {
      const timer = setTimeout(() => {
        setGameReady(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameReady, countdown]);

  const startGame = () => {
    if (!userName) {
      toast.error("Name is required to start the game.");
      return;
    }

    switch (params.entryMode) {
      case "random":
        setRoom("");
        sendMessage(
          JSON.stringify({
            type: "GetRoom",
            player_name: userName,
          } as GetRoomMessage),
        );
        setStart(true);
        setLoading(true);
        break;
      case "create":
        if (!room) {
          toast.error("Code is required to create a room.");
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
        setStart(true);
        setLoading(true);
        break;
      case "join":
        if (!room) {
          toast.error("Code is required to join a room.");
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
        setStart(true);
        setLoading(true);
        break;
      default:
        toast.error("Invalid game mode.");
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
            className="w-full max-w-md p-8 bg-gray-800/80 rounded-2xl shadow-xl border border-gray-700/50 backdrop-blur-sm"
          >
            {/* ... setup content remains the same (just update colors for dark mode) */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/25">
                <span className="text-3xl">⌨️</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {params.entryMode === "random" && "🎲 Quick Match"}
                {params.entryMode === "create" && "🔐 Create Room"}
                {params.entryMode === "join" && "🚪 Join Room"}
              </h2>
              <p className="text-gray-300 mt-2">
                {params.entryMode === "random" && "Find an opponent instantly"}
                {params.entryMode === "create" && "Set up a private game"}
                {params.entryMode === "join" && "Enter a friend's code"}
              </p>
            </div>

            <div className="space-y-4">
              {params.entryMode !== "random" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., SPEED-RACE-2024"
                    value={room}
                    onChange={(e) => setRoom(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-600 bg-gray-700/50 rounded-xl text-lg text-white placeholder-gray-400 outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all uppercase tracking-wider"
                    maxLength={20}
                  />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your display name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-600 bg-gray-700/50 rounded-xl text-lg text-white placeholder-gray-400 outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
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
                className="w-full mt-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 flex items-center justify-center gap-2"
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

            {!wallet.connected && (
              <p className="mt-4 text-xs text-center text-gray-500">
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
              className="inline-block w-20 h-20 border-4 border-gray-700 border-t-cyan-500 rounded-full mb-6"
            />
            <h3 className="text-xl font-semibold text-white mb-2">
              {params.entryMode === "random"
                ? "🔍 Finding opponent..."
                : "⏳ Waiting for player..."}
            </h3>
            <p className="text-gray-400">Get your fingers ready!</p>
          </motion.div>
        )}

        {/* ✨ NEW: Get Ready / Countdown Screen */}
        {/* ✨ Get Ready / Countdown Screen - Fixed & Polished */}
        {start && !loading && gameReady && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="text-center relative w-full max-w-2xl mx-auto"
          >
            {/* Background Pulse Effect */}
            <motion.div
              className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <div className="w-72 h-72 bg-gradient-to-r from-cyan-500/25 via-purple-500/25 to-pink-500/25 rounded-full blur-3xl" />
            </motion.div>

            {/* ✨ Fixed-Size Countdown Container - No Layout Shift */}
            <div className="relative h-48 md:h-56 w-full flex items-center justify-center mb-4 overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={countdown}
                  initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 1.4, rotate: 12, y: -60 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    mass: 0.9,
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span
                    className={`text-8xl md:text-9xl lg:text-[10rem] font-black leading-none bg-gradient-to-r ${
                      countdown === 3
                        ? "from-cyan-400 to-blue-400"
                        : countdown === 2
                          ? "from-blue-400 to-purple-400"
                          : countdown === 1
                            ? "from-purple-400 to-pink-400"
                            : "from-green-400 to-emerald-400"
                    } bg-clip-text text-transparent drop-shadow-2xl`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {countdown > 0 ? countdown : "GO!"}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ✨ Fixed-Height Subtitle - No Jumping */}
            <div className="h-10 flex items-center justify-center mb-8">
              <AnimatePresence mode="wait">
                <motion.p
                  key={countdown > 0 ? "ready-text" : "go-text"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="text-lg md:text-xl text-gray-300 font-medium whitespace-nowrap"
                >
                  {countdown > 0 ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 bg-cyan-400 rounded-full"
                      />
                      Get ready to type...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-green-400">
                      <motion.span
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        🚀
                      </motion.span>
                      Type now!
                    </span>
                  )}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* ✨ Racing Track Opponent Display - Fixed VS Position */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-md mx-auto"
            >
              <div className="relative">
                {/* Track Background */}
                <div className="h-24 bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/60 overflow-hidden relative shadow-xl shadow-black/20">
                  {/* ✨ VS Badge - Positioned INSIDE Track, Centered Between Lanes */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.7,
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40 border-2 border-white/20"
                    >
                      <span className="text-xs font-black text-white italic tracking-tight">
                        VS
                      </span>
                    </motion.div>
                  </div>

                  {/* Lane Divider (Behind VS Badge) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-full h-px border-t-2 border-dashed border-gray-600/40" />
                  </div>

                  {/* Player 1 Lane (You) - Top */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 flex items-center px-4 z-10">
                    <motion.div
                      initial={{ x: -40, opacity: 0 }}
                      animate={{ x: 16, opacity: 1 }}
                      transition={{
                        delay: 0.5,
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                      }}
                      className="flex items-center gap-2"
                    >
                      {/* Name */}
                      <span className="text-sm font-semibold text-cyan-400 truncate max-w-[80px]">
                        {userName || "You"}
                      </span>
                    </motion.div>

                    {/* Running Emoji - Facing Right */}
                    <motion.div
                      animate={{
                        y: [0, -2, 0],
                        rotate: [0, -3, 3, -3, 0],
                      }}
                      transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="ml-auto text-xl"
                      style={{ scaleX: -1 }}
                    >
                      🏃🏻‍♂️
                    </motion.div>
                  </div>

                  {/* Player 2 Lane (Opponent) - Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-center px-4 z-10">
                    {/* Running Emoji - Facing Left */}
                    <motion.div
                      animate={{
                        y: [0, -2, 0],
                        rotate: [0, -3, 3, -3, 0],
                      }}
                      transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2,
                      }}
                      className="text-xl"
                      style={{ scaleX: -1 }}
                    >
                      🏃🏽
                    </motion.div>

                    {/* Name + Avatar */}
                    <motion.div
                      initial={{ x: 40, opacity: 0 }}
                      animate={{ x: -16, opacity: 1 }}
                      transition={{
                        delay: 0.5,
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                      }}
                      className="ml-auto flex items-center gap-2"
                    >
                      {/* Name */}
                      <span className="text-sm font-semibold text-purple-400 truncate max-w-[80px] text-right">
                        {opponentName || "Opponent"}
                      </span>
                    </motion.div>
                  </div>
                </div>

                {/* ✨ Ready Status Indicator */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-4 flex items-center justify-center gap-2"
                >
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-full border border-gray-700/60"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50"
                    />
                    <span className="text-xs text-gray-300 font-medium">
                      Both players ready
                    </span>
                  </motion.div>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-500/50" />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Game Area - TypeArea */}
        {start && !loading && !gameReady && !winner && (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl"
          >
            <TypeArea
              text={randomText}
              enemyProgress={enemyLetters}
              onChange={checkInputText}
              playerName={userName || "You"}
              enemyName={opponentName}
            />
          </motion.div>
        )}

        {/* Winner Screen */}
        {winner && (
          <motion.div
            key="winner"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-8 rounded-2xl text-center shadow-xl border-2 ${
              winner === userName
                ? "bg-gradient-to-br from-emerald-900/50 to-green-900/30 border-emerald-700/50"
                : "bg-gradient-to-br from-red-900/50 to-rose-900/30 border-red-700/50"
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
                winner === userName ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {winner === userName ? "You Won!" : `${winner} Won!`}
            </h3>
            <p className="text-gray-300 mb-6">
              {winner === userName
                ? "Amazing typing speed! 🎉"
                : "Better luck next time! 💪"}
            </p>

            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:from-cyan-400 hover:to-blue-500 transition-all duration-200"
                onClick={() => {
                  setStart(false);
                  setWinner("");
                  setEnemyLetters(0);
                  setRandomText("");
                  setRoom("");
                  setGameReady(false);
                  setCountdown(3);
                  setGamePDA("gamePDA");
                  setVaultPDA("vaultPDA");
                  setOpponentName("Opponent");
                  setLoading(false);
                }}
              >
                Play Again
              </motion.button>

              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-3 bg-gray-800 text-white font-semibold rounded-xl border border-gray-600 hover:bg-gray-700 transition-colors"
                >
                  Main Menu
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

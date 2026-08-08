"use client";

import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Home() {
  const wallet = useWallet();
  const router = useRouter();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const handleProtectedNavigation = (href: string) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Connect your wallet before choosing a match mode.");
      return;
    }

    router.push(href);
  };

  const features = [
    {
      icon: "⚡",
      desc: "Real-time duels",
    },
    {
      icon: "🌐",
      desc: "Decentralized",
    },
    {
      icon: "⛓️",
      desc: "Powered by Solana",
    },
    {
      icon: "💰",
      desc: "On-chain rewards",
    },
    {
      icon: "👛",
      desc: "Play with wallet",
    },
    {
      icon: "⚔️",
      desc: "Challenge your friends",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 py-12 max-w-3xl text-center"
      >
        {/* Logo */}
        <motion.div variants={item} className="mb-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-full shadow-lg border border-gray-700 mb-6">
            <motion.span
              animate={{ y: [0, -3, 0], rotate: [5, 0, 0, 5] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
              style={{ scaleX: -1 }}
              className="text-2xl"
            >
              🏃
            </motion.span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Race with Words
          </h1>

          <p className="text-xl text-gray-400 max-w-lg mx-auto">
            Challenge friends or random players in real-time typing duels. Fast
            fingers win! 🏁
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleProtectedNavigation("/random")}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            🎲 Random Match
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleProtectedNavigation("/create")}
            className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-blue-400 font-semibold rounded-xl shadow-md border border-gray-700 hover:border-blue-400 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            🔐 Create Room
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleProtectedNavigation("/join")}
            className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-purple-400 font-semibold rounded-xl shadow-md border border-gray-700 hover:border-purple-400 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            🚪 Join Room
          </motion.button>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="p-4 bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700 text-center"
            >
              <div className="text-2xl flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/25 via-white/5 to-cyan-500/25 ring-1 ring-white/10 shadow-lg shadow-indigo-500/10 mx-auto mb-4">
                <span>{feature.icon}</span>
              </div>

              <h3 className="font-semibold text-white mb-1 text-center">
                {feature.desc}
              </h3>
            </motion.div>
          ))}
        </motion.div>

        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 mt-12 py-6">
          <motion.a
            whileHover={{ scale: 1.15, y: -3 }}
            whileTap={{ scale: 0.95 }}
            href="https://github.com/sanket-164/Word-Dash"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 transition-colors duration-300 hover:text-white"
            aria-label="View source on GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}

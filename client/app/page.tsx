"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
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

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 py-12 max-w-2xl text-center"
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
            fingers win! 🏆
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <Link href="/random">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              🎲 Random Match
            </motion.button>
          </Link>

          <Link href="/create">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-blue-400 font-semibold rounded-xl shadow-md border border-gray-700 hover:border-blue-400 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              🔐 Create Room
            </motion.button>
          </Link>

          <Link href="/join">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-purple-400 font-semibold rounded-xl shadow-md border border-gray-700 hover:border-purple-400 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              🚪 Join Room
            </motion.button>
          </Link>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        >
          {[
            {
              icon: "⚡",
              title: "Real-time",
              desc: "Live sync with opponents",
            },
            { icon: "🌍", title: "Global", desc: "Play with anyone, anywhere" },
            { icon: "🏅", title: "Rewards", desc: "Earn tokens for victories" },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="p-4 bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

const TopBar = () => {
  return (
    <div className="w-full bg-gray-950 border-b border-gray-800 backdrop-blur-md">
      <div className="max-w-6xl mx-auto h-14 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-white tracking-tight">
            WordDash
          </h1>
          <span className="text-xl" style={{ transform: "scaleX(-1)" }}>
            🏃
          </span>
        </Link>

        <WalletMultiButton />
      </div>
    </div>
  );
};

export default TopBar;

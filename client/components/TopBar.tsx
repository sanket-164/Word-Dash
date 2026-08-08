"use client";

import Image from "next/image";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const TopBar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo + Name */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="WordDash logo"
            width={35}
            height={35}
            priority
            className="object-contain"
          />

          <span className="bg-gradient-to-r from-white via-indigo-100 to-cyan-100 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            Word Dash
          </span>
        </div>

        {/* Wallet Button */}
        <div className="flex items-center">
          <WalletMultiButton className="!rounded-xl !bg-white/5 !px-4 !py-2 !text-sm !font-semibold !text-white !ring-1 !ring-white/10 transition hover:!bg-white/10" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;

"use client";
import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import "@solana/wallet-adapter-react-ui/styles.css";

const AGREEMENT_STORAGE_PREFIX = "worddash-wallet-guidelines-accepted";

function WalletGuidelinesGate({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const syncModalState = () => {
      if (!wallet.connected || !wallet.publicKey) {
        setShowModal(false);
        setAgreed(false);
        return;
      }

      const storageKey = `${AGREEMENT_STORAGE_PREFIX}:${wallet.publicKey.toString()}`;
      const hasAccepted = window.localStorage.getItem(storageKey) === "true";

      setAgreed(hasAccepted);
      setShowModal(!hasAccepted);
    };

    const timeoutId = window.setTimeout(syncModalState, 0);

    return () => window.clearTimeout(timeoutId);
  }, [wallet.connected, wallet.publicKey]);

  const handleContinue = () => {
    if (!wallet.publicKey || !agreed) {
      toast.error("Please agree to the guidelines to play.");
      return;
    }

    const storageKey = `${AGREEMENT_STORAGE_PREFIX}:${wallet.publicKey.toString()}`;
    window.localStorage.setItem(storageKey, "true");
    setShowModal(false);
  };

  const handleDisconnect = async () => {
    setShowModal(false);
    setAgreed(false);
    await wallet.disconnect();
  };

  return (
    <>
      {children}

      <AnimatePresence>
        {showModal && wallet.connected && wallet.publicKey && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-3xl border border-cyan-500/15 bg-gradient-to-b from-zinc-900 to-black p-7 text-white shadow-2xl shadow-cyan-500/10"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-3xl font-bold uppercase tracking-[0.25em] text-cyan-400">
                Dash Rules
              </h2>

              <ul className="mt-7 space-y-3">
                <li className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-4 pl-7">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-r-full bg-cyan-400"
                  />
                  <span className="block text-sm leading-6 text-gray-300">
                    You must approve the smart contract transaction to lock your
                    entry fee into the escrow vault before the match begins.
                  </span>
                </li>

                <li className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-4 pl-7">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-r-full bg-cyan-400"
                  />
                  <span className="block text-sm leading-6 text-gray-300">
                    If you win, you must manually approve the on-chain
                    transaction to claim the prize pool. Failing to sign the
                    claim transaction will result in losing your winnings.
                  </span>
                </li>

                <li className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-4 pl-7">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-r-full bg-cyan-400"
                  />
                  <span className="block text-sm leading-6 text-gray-300">
                    Disconnecting, closing the tab, or losing connection during
                    an active match results in an automatic loss. Your opponent
                    will be awarded the entire pot.
                  </span>
                </li>

                <li className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-4 pl-7">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1.5 rounded-r-full bg-cyan-400"
                  />
                  <span className="block text-sm leading-6 text-gray-300">
                    Players are responsible for all Solana network fees (gas)
                    required to fund the escrow and claim winnings.
                  </span>
                </li>
              </ul>

              <label
                className={`mt-6 flex cursor-pointer select-none items-center gap-3 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99] ${
                  agreed
                    ? "border-cyan-400/40 bg-cyan-500/15 shadow-lg shadow-cyan-500/20"
                    : "border-cyan-500/15 bg-cyan-500/5 hover:border-cyan-400/30 hover:bg-cyan-500/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-gray-600 bg-transparent text-cyan-400 accent-cyan-400 focus:ring-cyan-400"
                />

                <span className="text-sm font-medium text-gray-100">
                  I Agree.
                </span>
              </label>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/10 active:scale-[0.98]"
                >
                  Disconnect Wallet
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!agreed}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function SolanaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = "https://api.devnet.solana.com";
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletGuidelinesGate>{children}</WalletGuidelinesGate>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

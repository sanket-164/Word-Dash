import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../idl/game_program.json";
import { WalletContextState } from "@solana/wallet-adapter-react";

const programId = new PublicKey("BhLbReZE6jzQ2zvHxHZsahHoxKwzXiLBh3XVua2wgtaF");

export function getProgram(wallet: WalletContextState) {
  const connection = new Connection("https://api.devnet.solana.com");

  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error("Wallet not connected");
  }

  const anchorWallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction!,
    signAllTransactions: wallet.signAllTransactions!,
  } as unknown as anchor.Wallet;

  const provider = new anchor.AnchorProvider(
    connection,
    anchorWallet,
    { commitment: "confirmed" }
  );

  return new anchor.Program(idl as anchor.Idl, provider);
}

export async function initializeGame(wallet: WalletContextState) {

  if (!wallet.publicKey) return;

  const program = getProgram(wallet);

  const betAmount = new anchor.BN(1_000_000); // 0.001 SOL in lamports

  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), wallet.publicKey.toBuffer()],
    program.programId,
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), gamePda.toBuffer()],
    program.programId,
  );

  await program.methods
    .initializeGame(betAmount)
    .accounts({
      game: gamePda,
      vault: vaultPda,
      player1: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  alert("Game initialized!");

  return {
    gamePda: gamePda.toString(),
    vaultPda: vaultPda.toString(),
  };
}

export async function joinGame(wallet: WalletContextState, gamePda: string, vaultPda: string) {

  if (!wallet.publicKey) return;

  const program = getProgram(wallet);

  await program.methods
    .joinGame()
    .accounts({
      game: new PublicKey(gamePda),
      vault: new PublicKey(vaultPda),
      player2: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  alert("Joined game!");
}

export async function end_game(wallet: WalletContextState, gamePda: string, vaultPda: string) {

  if (!wallet.publicKey) return;

  const program = getProgram(wallet);

  await program.methods
    .endGame(wallet.publicKey)
    .accounts({
      game: new PublicKey(gamePda),
      vault: new PublicKey(vaultPda),
      winnerAccount: wallet.publicKey,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  alert("Game ended!");
}
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../idl/game_program.json";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { GameProgram } from "../app/types/game_program";

export function getProgram(wallet: WalletContextState) {
  const connection = new Connection("https://api.devnet.solana.com");

  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error("Wallet not connected");
  }

  const anchorWallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  } as anchor.Wallet;

  const provider = new anchor.AnchorProvider(
    connection,
    anchorWallet,
    { commitment: "confirmed" }
  );

  return new anchor.Program(idl as anchor.Idl, provider) as unknown as anchor.Program<GameProgram>;
}

export async function initializeGame(wallet: WalletContextState) {
  if (!wallet.publicKey) return;

  const program = getProgram(wallet);

  const betAmount = new anchor.BN(1_000_000_00); // 0.1 SOL

  const seed = new anchor.BN(Date.now()); // unique game seed
  const seedBuffer = seed.toArrayLike(Buffer, "le", 8);

  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), wallet.publicKey.toBuffer(), seedBuffer],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), gamePda.toBuffer()],
    program.programId
  );

  await program.methods
    .initializeGame(seed, betAmount)
    .accountsStrict({
      game: gamePda,
      vault: vaultPda,
      player1: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return {
    gamePda: gamePda.toString(),
    vaultPda: vaultPda.toString(),
  };
}

export async function joinGame(
  wallet: WalletContextState,
  gamePda: string,
  vaultPda: string
) {
  if (!wallet.publicKey) return;

  const program = getProgram(wallet);

  await program.methods
    .joinGame()
    .accountsStrict({
      game: new PublicKey(gamePda),
      vault: new PublicKey(vaultPda),
      player2: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function endGame(
  wallet: WalletContextState,
  gamePda: string,
  vaultPda: string,
  winner: PublicKey
) {
  if (!wallet.publicKey) return;

  const program = getProgram(wallet);

  // Fetch the game account to get Player 1's pubkey (who gets the rent back)
  const gameData = await program.account.game.fetch(gamePda);
  const player1Pubkey = gameData.player1;

  await program.methods
    .endGame(winner)
    .accountsStrict({
      game: new PublicKey(gamePda),
      vault: new PublicKey(vaultPda),
      player1: player1Pubkey,
      winnerAccount: winner,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function cancelGame(
  wallet: WalletContextState,
  gamePda: string,
  vaultPda: string
) {
  if (!wallet.publicKey) return;

  const program = getProgram(wallet);

  await program.methods
    .cancelGame()
    .accountsStrict({
      game: new PublicKey(gamePda),
      vault: new PublicKey(vaultPda),
      player1: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "../idl/game_program.json";

const programId = new PublicKey("BhLbReZE6jzQ2zvHxHZsahHoxKwzXiLBh3XVua2wgtaF");

export function getProgram(wallet: anchor.Wallet) {
  const connection = new Connection("https://api.devnet.solana.com");

  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  return new anchor.Program(idl as anchor.Idl, provider);
}

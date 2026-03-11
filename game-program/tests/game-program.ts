import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GameProgram } from "../target/types/game_program";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("game-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GameProgram as Program<GameProgram>;

  const player1 = provider.wallet;
  const player2 = Keypair.generate();

  const seed = new anchor.BN(1);
  const betAmount = new anchor.BN(1_000_000);

  let gamePda: PublicKey;
  let vaultPda: PublicKey;

  before(async () => {

    // Airdrop to player2
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        player2.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    const seedBuffer = seed.toArrayLike(Buffer, "le", 8);

    [gamePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("game"),
        player1.publicKey.toBuffer(),
        seedBuffer,
      ],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        gamePda.toBuffer(),
      ],
      program.programId
    );

    console.log("Game PDA:", gamePda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());
  });

  it("Initialize Game", async () => {
    await program.methods
      .initializeGame(seed, betAmount)
      .accounts({
        game: gamePda,
        vault: vaultPda,
        player1: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const game = await program.account.game.fetch(gamePda);

    assert.ok(game.player1.equals(player1.publicKey));
    assert.equal(game.betAmount.toNumber(), betAmount.toNumber());
  });

  it("Join Game", async () => {
    await program.methods
      .joinGame()
      .accounts({
        game: gamePda,
        vault: vaultPda,
        player2: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    const game = await program.account.game.fetch(gamePda);

    assert.ok(game.player2.equals(player2.publicKey));
  });

  it("End Game", async () => {
    const winner = player1.publicKey;

    await program.methods
      .endGame(winner)
      .accounts({
        game: gamePda,
        vault: vaultPda,
        winnerAccount: winner,
        authority: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const game = await program.account.game.fetch(gamePda);

    assert.equal(game.isActive, false);
    assert.ok(game.winner.equals(winner));
  });
});
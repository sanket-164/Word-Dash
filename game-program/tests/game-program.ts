import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GameProgram } from "../target/types/game_program";
import { SystemProgram, Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("game_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GameProgram as Program<GameProgram>;

  const player1 = provider.wallet;
  const player2 = Keypair.generate();

  const betAmount = new anchor.BN(1_000_000_000); // 1 SOL

  let gamePda: PublicKey;
  let vaultPda: PublicKey;

  before(async () => {
    // Airdrop to player2
    const sig = await provider.connection.requestAirdrop(
      player2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    // Derive Game PDA
    [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), player1.publicKey.toBuffer()],
      program.programId
    );

    // Derive Vault PDA
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), gamePda.toBuffer()],
      program.programId
    );
  });

  it("Initialize Game", async () => {
    const balanceBefore = await provider.connection.getBalance(
      player1.publicKey
    );

    await program.methods
      .initializeGame(betAmount)
      .accounts({
        game: gamePda,
        vault: vaultPda,
        player1: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultBalance = await provider.connection.getBalance(vaultPda);

    assert.equal(
      vaultBalance,
      betAmount.toNumber(),
      "Vault should contain Player1 deposit"
    );

    const gameAccount = await program.account.game.fetch(gamePda);
    assert.ok(gameAccount.isActive);
    assert.equal(
      gameAccount.player1.toBase58(),
      player1.publicKey.toBase58()
    );
  });

  it("Player2 Joins Game", async () => {
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

    const vaultBalance = await provider.connection.getBalance(vaultPda);

    assert.equal(
      vaultBalance,
      betAmount.toNumber() * 2,
      "Vault should contain both deposits"
    );

    const gameAccount = await program.account.game.fetch(gamePda);
    assert.equal(
      gameAccount.player2.toBase58(),
      player2.publicKey.toBase58()
    );
  });

  it("End Game and Pay Winner", async () => {
    const winner = player1.publicKey;

    const winnerBalanceBefore = await provider.connection.getBalance(winner);

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


    const vaultBalance = await provider.connection.getBalance(vaultPda);
    const winnerBalanceAfter = await provider.connection.getBalance(winner);

    assert.equal(vaultBalance, 0, "Vault should be drained");

    assert.isTrue(
      winnerBalanceAfter > winnerBalanceBefore,
      "Winner should receive funds"
    );

    const gameAccount = await program.account.game.fetch(gamePda);
    assert.isFalse(gameAccount.isActive);
    assert.equal(gameAccount.winner.toBase58(), winner.toBase58());
  });
});

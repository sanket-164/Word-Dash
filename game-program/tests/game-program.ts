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
  const betAmount = new anchor.BN(1_000_000_00); // 0.1 SOL

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
      [Buffer.from("vault"), gamePda.toBuffer()],
      program.programId
    );

    console.log("Game PDA:", gamePda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());
  });

  it("Initialize Game", async () => {
    const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);

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

    const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
    const paidAmount = player1BalanceBefore - player1BalanceAfter;
    
    console.log(`💰 Player 1 paid: ${paidAmount} lamports (includes bet + rent for accounts)`);
    assert.ok(paidAmount > betAmount.toNumber());
  });

  it("Join Game", async () => {
    const player2BalanceBefore = await provider.connection.getBalance(player2.publicKey);

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

    const player2BalanceAfter = await provider.connection.getBalance(player2.publicKey);
    const paidAmount = player2BalanceBefore - player2BalanceAfter;

    console.log(`💰 Player 2 paid: ${paidAmount} lamports (only bet + small tx fees, NO rent)`);
    
    // Changed `>` to `>=` because local test validators sometimes have 0 tx fees.
    assert.ok(paidAmount >= betAmount.toNumber()); 
    assert.ok(paidAmount <= betAmount.toNumber() + 5_000_000); 
  });

  it("End Game", async () => {
    const winner = player1.publicKey;

    const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);
    // Note: Player 2's balance does NOT change during the "End Game" transaction because
    // they already paid their bet in the previous "Join Game" transaction.

    await program.methods
      .endGame(winner)
      .accounts({
        game: gamePda,
        vault: vaultPda,
        player1: player1.publicKey,
        winnerAccount: winner,
        authority: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // The `close` constraint deletes the game account.
    const gameAccountInfo = await provider.connection.getAccountInfo(gamePda);
    assert.isNull(gameAccountInfo, "Game account should be closed and rent refunded");

    const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
    const player1Profit = player1BalanceAfter - player1BalanceBefore;

    console.log(`🏆 Player 1 (Winner) net profit during EndGame: ${player1Profit} lamports`);

    // Player 1 gets the prize pool (2x bet) plus all the rent refunds.
    assert.ok(
      player1Profit >= betAmount.toNumber() * 2,
      "Player 1 should have received the prize pool (2x bet) plus rent refunds"
    );
  });

  describe("Cancel Game Flow", () => {
    const cancelSeed = new anchor.BN(2);
    let cancelGamePda: PublicKey;
    let cancelVaultPda: PublicKey;

    before(async () => {
      const seedBuffer = cancelSeed.toArrayLike(Buffer, "le", 8);
      
      [cancelGamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), player1.publicKey.toBuffer(), seedBuffer],
        program.programId
      );

      [cancelVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), cancelGamePda.toBuffer()],
        program.programId
      );
    });

    it("Initialize Game for Cancel", async () => {
      await program.methods
        .initializeGame(cancelSeed, betAmount)
        .accounts({
          game: cancelGamePda,
          vault: cancelVaultPda,
          player1: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const game = await program.account.game.fetch(cancelGamePda);
      assert.ok(game.player1.equals(player1.publicKey));
    });

    it("Cancel Game (Refund)", async () => {
      const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);

      await program.methods
        .cancelGame()
        .accounts({
          game: cancelGamePda,
          vault: cancelVaultPda,
          player1: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const gameAccountInfo = await provider.connection.getAccountInfo(cancelGamePda);
      assert.isNull(gameAccountInfo, "Game account should be closed");

      const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
      
      const netChange = player1BalanceAfter - player1BalanceBefore;
      console.log(`↩️ Player 1 Cancel Net Change: ${netChange} lamports`);

      // Player 1 gets their bet + game rent + vault rent back.
      // The only loss should be minor transaction fees. 
      assert.ok(
        netChange > -10_000_000,
        "Player 1 should have been fully refunded (bet + rent)"
      );
    });
  });
});
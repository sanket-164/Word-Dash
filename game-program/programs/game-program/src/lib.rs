use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("BhLbReZE6jzQ2zvHxHZsahHoxKwzXiLBh3XVua2wgtaF");

#[program]
pub mod game_program {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>, seed: u64, bet_amount: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;

        game.player1 = ctx.accounts.player1.key();
        game.player2 = Pubkey::default();
        game.bet_amount = bet_amount;
        game.is_active = true;
        game.winner = Pubkey::default();
        game.seed = seed;
        game.vault_bump = ctx.bumps.vault;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player1.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );

        system_program::transfer(cpi_context, bet_amount)?;

        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;

        require!(game.player2 == Pubkey::default(), ErrorCode::GameFull);
        require!(game.is_active, ErrorCode::GameInactive);

        game.player2 = ctx.accounts.player2.key();

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player2.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );

        system_program::transfer(cpi_context, game.bet_amount)?;

        Ok(())
    }

    pub fn end_game(ctx: Context<EndGame>, winner: Pubkey) -> Result<()> {
        let game = &ctx.accounts.game;

        require!(game.is_active, ErrorCode::GameInactive);
        require!(game.player2 != Pubkey::default(), ErrorCode::GameNotFull);

        require!(
            winner == game.player1 || winner == game.player2,
            ErrorCode::InvalidWinner
        );

        require!(
            ctx.accounts.winner_account.key() == winner,
            ErrorCode::InvalidWinnerAccount
        );

        // 1. Transfer the bet winnings from the vault to the winner
        let vault_balance = game.bet_amount * 2;
        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= vault_balance;
        **ctx.accounts.winner_account.try_borrow_mut_lamports()? += vault_balance;

        // 2. Drain the remaining SOL (rent) from the vault back to player1
        let vault_rent = ctx.accounts.vault.to_account_info().lamports();
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= vault_rent;
        **ctx.accounts.player1.to_account_info().try_borrow_mut_lamports()? += vault_rent;
        
        Ok(())
    }

    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        // 1. Refund the initial bet amount from the vault to player1
        let bet_amount = ctx.accounts.game.bet_amount;
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= bet_amount;
        **ctx.accounts.player1.to_account_info().try_borrow_mut_lamports()? += bet_amount;

        // 2. Drain the vault rent back to player1
        let vault_rent = ctx.accounts.vault.to_account_info().lamports();
        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= vault_rent;
        **ctx.accounts.player1.to_account_info().try_borrow_mut_lamports()? += vault_rent;
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = player1,
        space = 8 + Game::INIT_SPACE,
        seeds = [b"game", player1.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,

    /// CHECK: This is a PDA used only as a SOL vault for the game. It is initialized with space = 0.
    #[account(
        init,
        payer = player1,
        space = 0,
        seeds = [b"vault", game.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub player1: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,

    /// CHECK: PDA that holds SOL for the game. Validated via seeds and bump.
    #[account(
        mut,
        seeds = [b"vault", game.key().as_ref()],
        bump = game.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub player2: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(
        mut, 
        close = player1, 
        constraint = game.is_active @ ErrorCode::GameInactive
    )]
    pub game: Account<'info, Game>,

    /// CHECK: PDA that holds SOL for the game. Validated via seeds and bump.
    #[account(
        mut,
        seeds = [b"vault", game.key().as_ref()],
        bump = game.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: The original payer of the game account, who gets the rent back. Validated via constraint.
    #[account(
        mut,
        constraint = player1.key() == game.player1 @ ErrorCode::InvalidPlayer1
    )]
    pub player1: AccountInfo<'info>,

    /// CHECK: Validated in instruction logic to match the winner.
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(
        mut, 
        close = player1,
        has_one = player1 @ ErrorCode::InvalidAuthority,
        constraint = game.player2 == Pubkey::default() @ ErrorCode::GameAlreadyJoined
    )]
    pub game: Account<'info, Game>,

    /// CHECK: PDA that holds SOL for the game. Validated via seeds and bump.
    #[account(
        mut,
        seeds = [b"vault", game.key().as_ref()],
        bump = game.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub player1: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Game {
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub bet_amount: u64,
    pub winner: Pubkey,
    pub is_active: bool,
    pub seed: u64,
    pub vault_bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Game already has 2 players")]
    GameFull,

    #[msg("Game does not have 2 players yet")]
    GameNotFull,

    #[msg("Game is not active")]
    GameInactive,

    #[msg("Invalid winner")]
    InvalidWinner,

    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("Winner account does not match")]
    InvalidWinnerAccount,

    #[msg("Invalid player1 account")]
    InvalidPlayer1,

    #[msg("Cannot cancel: Player 2 has already joined")]
    GameAlreadyJoined,
}
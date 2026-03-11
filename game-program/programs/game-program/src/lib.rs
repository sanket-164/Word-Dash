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
        let game = &mut ctx.accounts.game;

        require!(game.is_active, ErrorCode::GameInactive);

        require!(
            winner == game.player1 || winner == game.player2,
            ErrorCode::InvalidWinner
        );

        require!(
            ctx.accounts.winner_account.key() == winner,
            ErrorCode::InvalidWinnerAccount
        );

        game.winner = winner;
        game.is_active = false;

        let vault_balance = game.bet_amount * 2;

        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= vault_balance;
        **ctx.accounts.winner_account.try_borrow_mut_lamports()? += vault_balance;

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

    /// CHECK: This is a PDA used only as a SOL vault for the game.
    /// It is derived using seeds [b"vault", game.key()] and controlled by the program.
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

    /// CHECK: PDA that holds SOL for the game
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
    #[account(mut)]
    pub game: Account<'info, Game>,

    /// CHECK: PDA that holds SOL for the game
    #[account(
        mut,
        seeds = [b"vault", game.key().as_ref()],
        bump = game.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: validated in instruction
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,

    pub authority: Signer<'info>,

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

    #[msg("Game is not active")]
    GameInactive,

    #[msg("Invalid winner")]
    InvalidWinner,

    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("Winner account does not match")]
    InvalidWinnerAccount,
}

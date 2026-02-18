use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("BhLbReZE6jzQ2zvHxHZsahHoxKwzXiLBh3XVua2wgtaF");

#[program]
pub mod game_program {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>, bet_amount: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.player1 = ctx.accounts.player1.key();
        game.player2 = Pubkey::default();
        game.bet_amount = bet_amount;
        game.is_active = true;
        game.winner = Pubkey::default();

        // Transfer SOL from player1 to vault
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

        // Transfer SOL from player2 to vault
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

        game.winner = winner;
        game.is_active = false;

        let vault_balance = ctx.accounts.vault.to_account_info().lamports();

        let binding = game.key();

        let seeds = &[b"vault", binding.as_ref(), &[ctx.bumps.vault]];

        let signer = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.winner_account.to_account_info(),
            },
            signer,
        );

        system_program::transfer(cpi_context, vault_balance)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = player1,
        space = 8 + 32 + 32 + 8 + 32 + 1,
        seeds = [b"game", player1.key().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"vault", game.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub player1: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"vault", game.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub player2: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"vault", game.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    /// CHECK: winner account
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Game {
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub bet_amount: u64,
    pub winner: Pubkey,
    pub is_active: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Game already has 2 players")]
    GameFull,

    #[msg("Game is not active")]
    GameInactive,

    #[msg("Invalid winner")]
    InvalidWinner,
}

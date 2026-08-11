# Word Dash (<a href="https://word-dash.netlify.app/" target="__blank">**Play**</a>)

Word Dash is a real-time multiplayer typing game built with Rust, Next.js, WebSockets, and Solana. Challenge another player in a fast-paced typing race, stake SOL through an on-chain Anchor smart contract, and automatically claim the winner’s reward from a shared vault. Features Quick Match, private rooms, real-time typing progress, on-chain staking, automatic payouts, and retryable blockchain claims.

## Overview

1. Connect: Players connect their Solana wallets.
2. Match: Players find an opponent via Quick Match, Create Room, or Join Room.
3. Stake: Both players lock tokens in a smart contract vault.
4. Race: A random text appears. First to type it correctly wins!
5. Claim: The winner claims the entire pot directly from the blockchain.

## Watch Demo of the game

<div align="center"">
  <a href="https://www.youtube.com/watch?v=SclogtiXu8c">
    <img src="./client/public/logo.png" alt="Watch the video" height="400" />
  </a>
</div>

## Technologies

- Frontend: Next.js, TypeScript, Tailwind CSS, Solana Wallet Adapter
- Backend: Rust, WebSockets, Tokio
- Blockchain: Solana, Anchor, SOL, Program Derived Addresses, on-chain vaults
- Infrastructure: Docker, Docker Compose

## Rooms

The server keeps every active match in a `Room` struct, with 2 player slots, their names, funding status, and whether the game has started. `ChannelManager` owns a map of all rooms plus a set of "available" rooms used for random matchmaking.

- Random matches get an auto-generated name like `room_<timestamp>`.
- Create/Join matches use whatever code the player typed.

## Matching Flow

### Random Match

1. Client sends `GetRoom`.
2. If an open room exists, the server puts the player in it as player 2 and sends `JoinedRoom`.
3. If not, the server makes a new room name and sends `NewRoom` back — the client then sends `CreateRoom` for that name, becoming player 1.

### Create / Join

- **Create:** client sends `CreateRoom` directly with their chosen code. Server creates the room, player becomes player 1, gets `CreatedRoom` back, and waits.
- **Join:** client sends `JoinRoom` with the code. Server checks the room exists and isn't full, then adds them as player 2, sending `JoinedRoom`.

## Funding on Solana

Before the race can start, **both players must stake into the game on-chain**. This is why there's an extra funding handshake after matching:

1. When player 2 joins, the server tells player 1 the room is ready: `RoomReadyForFunding`.
2. Player 1's client calls `initializeGame` that creates the on-chain game and vault PDAs, then sends `FundCreateRoom` with the resulting `game_pda` / `vault_pda`.
3. Server marks player 1 as funded and tells player 2 via `CreateRoomFunded`.
4. Player 2's client calls `joinGame` that stakes into the same vault on-chain, then sends `FundJoinRoom`.
5. Once **both** players are funded, the server marks the game as started and broadcasts a `Text` message, this is the random paragraph both players will type. The race begins.

> If a player's wallet transaction fails at any point, they leave the room and see an error.

## The Race

- `TypeArea` (frontend component) tracks how much of the text each player has typed correctly.
- Every keystroke sends a `SendProgress` message with the player's current progress.
- The server relays this to the opponent as `OpponentProgress`, which drives their progress bar.
- When a player finishes the full text, their client sends `GameWinner`.
- The server broadcasts `GameWinner` to the whole room, so both clients know who won.
- The winning client automatically calls `endGame` on Solana, which pays out the vault to the winner.
- If the claim transaction fails, the UI shows a "Claim failed" screen with a **Retry** button.

## Leaving / Canceling

- After a winner is decided, both clients send `LeaveRoom` to clean up the room server-side.
- If a player leaves **while waiting** before the race starts, they can cancel:
  - If they already funded the game (player 1 with a real `game_pda`/`vault_pda`), canceling also refunds their stake on-chain (`cancelOnChainGame`).
  - Otherwise it's just a "leave the queue", nothing to refund.
- If a player **disconnects mid-race**, the server detects the socket closing, tells the remaining player via `OpponentLeft`, and that player is automatically declared the winner.

## Setup

### Prerequisites

- Node.js 20+
- Rust and Cargo
- Solana CLI
- Anchor CLI
- Docker (optional, for running everything in containers)

### 1. Install project dependencies

```bash
cd client && npm install
cd ../game-program && npm install
cd ../server && cargo build
```

### 2. Solana and Anchor setup

If you do not already have a Solana wallet configured, create one:

```bash
solana-keygen new --outfile ~/.config/solana/id.json
solana config set --url devnet
```

If you are using devnet, fund your wallet:

```bash
solana airdrop 2
```

Install Anchor CLI:

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

Verify the install:

```bash
anchor --version
solana --version
```

### 3. Build and deploy the game program

From the game-program directory:

```bash
cd game-program
anchor build
anchor deploy
```

### 4. Run the server

Start the websocket server:

```bash
cd server
cargo run
```

The server listens on port 8000.

### 5. Run the client

Create .env file and add

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

In a separate terminal:

```bash
cd client
```

The client will be available at http://localhost:3000.

### 6. Run everything with Docker

From the repository root:

```bash
docker compose up --build
```

- Server: http://localhost:8000
- Client: http://localhost:3000

> Note: the client uses the Solana devnet RPC endpoint, so you need a funded devnet wallet and a deployed Anchor program to play the full game flow.

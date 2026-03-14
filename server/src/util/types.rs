use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    GetRoom {},
    CreateRoom {
        room_name: String,
        pub_key: String,
    },
    FundCreateRoom {
        player_name: String,
        room_name: String,
        game_pda: String,
        vault_pda: String,
        pub_key: String,
    },
    JoinRoom {
        room_name: String,
        pub_key: String,
    },
    FundJoinRoom {
        player_name: String,
        room_name: String,
        game_pda: String,
        vault_pda: String,
        pub_key: String,
    },
    StartDash {},
    SendProgress {
        player_name: String,
        progress: i32,
    },
    GameWinner {
        player_name: String,
        game_pda: String,
        vault_pda: String,
        pub_key: String,
    },
    LeaveRoom {
        room_name: String,
    },
    Broadcast {
        content: String,
    },
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    NewRoom {
        room_name: String,
    },
    CreatedRoom {
        room_name: String,
    },
    CreateRoomFunded {
        room_name: String,
        game_pda: String,
        vault_pda: String,
    },
    JoinedRoom {
        opponent_name: String,
        opponent_pubkey: String,
        room_name: String,
        game_pda: String,
        vault_pda: String,
    },
    JoinRoomFunded {
        room_name: String,
        game_pda: String,
        vault_pda: String,
    },
    OpponentJoined {
        player_name: String,
    },
    Text {
        content: String,
    },
    OpponentProgress {
        player_name: String,
        progress: i32,
    },
    GameWinner {
        player_name: String,
        game_pda: String,
        vault_pda: String,
        pub_key: String,
    },
    OpponentLeft {},
    Error {
        content: String,
    },
}

#[derive(Clone)]
pub struct Player {
    pub player_name: String,
    pub game_pda: String,
    pub vault_pda: String,
    pub pub_key: String,
}

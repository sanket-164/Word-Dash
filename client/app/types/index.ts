export type GetRoomMessage = {
  type: "GetRoom";
};

export type CreateRoomMessage = {
  type: "CreateRoom";
  player_name: string;
  room_name: string;
  game_pda: string;
  vault_pda: string;
  pub_key: string;
};

export type JoinRoomMessage = {
  type: "JoinRoom";
  player_name: string;
  room_name: string;
  game_pda: string;
  vault_pda: string;
  pub_key: string;
};

export type StartDashMessage = {
  type: "StartDash";
};

export type SendProgressMessage = {
  type: "SendProgress";
  player_name: string;
  progress: number;
};

export type GameWinnerClientMessage = {
  type: "GameWinner";
  player_name: string;
  game_pda: string;
  vault_pda: string;
  pub_key: string;
};

export type LeaveRoomMessage = {
  type: "LeaveRoom";
  room_name: string;
};

export type BroadcastMessage = {
  type: "Broadcast";
  content: string;
};

export type NewRoomMessage = {
  type: "NewRoom";
  room_name: string;
};

export type AvailableRoomMessage = {
  type: "AvailableRoom";
  player_name: string;
  room_name: string;
  game_pda: string;
  vault_pda: string;
};

export type CreatedRoomMessage = {
  type: "CreatedRoom";
  room_name: string;
  game_pda: string,
  vault_pda: string,
};

export type JoinedRoomMessage = {
  type: "JoinedRoom";
  room_name: string;
  game_pda: string,
  vault_pda: string,
};

export type OpponentJoinedMessage = {
  type: "OpponentJoined";
  player_name: string;
};

export type TextMessage = {
  type: "Text";
  content: string;
};

export type OpponentProgressMessage = {
  type: "OpponentProgress";
  progress: number;
};

export type GameWinnerMessage = {
  type: "GameWinner";
  player_name: string;
  game_pda: string;
  vault_pda: string;
  pub_key: string;
};

export type OpponentLeftMessage = {
  type: "OpponentLeft";
};

export type ErrorMessage = {
  type: "Error";
  content: string;
};

export type ClientMessage =
  | GetRoomMessage
  | CreateRoomMessage
  | JoinRoomMessage
  | StartDashMessage
  | SendProgressMessage
  | GameWinnerClientMessage
  | LeaveRoomMessage
  | BroadcastMessage;

export type ServerMessage = NewRoomMessage
  | AvailableRoomMessage
  | CreatedRoomMessage
  | JoinedRoomMessage
  | OpponentJoinedMessage
  | TextMessage
  | OpponentProgressMessage
  | GameWinnerMessage
  | OpponentLeftMessage
  | ErrorMessage;

export type Player = {
  player_name: string;
  game_pda: string;
  vault_pda: string;
  pub_key: string;
};
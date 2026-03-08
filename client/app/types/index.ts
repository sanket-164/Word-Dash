export interface ServerMessage {
  type: "ROOM" | "TEXT" | "WINNER" | "ERROR" | "PROGRESS";
  content: string | number;
}
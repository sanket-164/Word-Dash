"use client";

import { useEffect } from "react";
import { connectWebSocket } from "@/lib/websocket";

export default function WebSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

    connectWebSocket(url);

    return () => {
      // optional cleanup
    };
  }, []);

  return <> {children} </>;
}

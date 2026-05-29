"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { BracketState } from "./use-bracket-poll";

// URL del mini-backend de tiempo real (scores-backend). Configurable por entorno.
const BACKEND_URL =
  process.env.NEXT_PUBLIC_SCORES_BACKEND_URL ?? "http://localhost:4000";

export type { BracketState };

/**
 * Suscripción 100% WebSocket a la llave de un campeonato vía scores-backend.
 * El servidor empuja el estado al suscribirse y cada vez que algo cambia
 * (sin polling). Si el backend está caído, `connected` es false.
 */
export function useBracketSocket(championshipId: string | null) {
  const [state, setState] = useState<BracketState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!championshipId) return;

    const socket: Socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    const onConnect = () => {
      setConnected(true);
      socket.emit("subscribe", championshipId);
    };
    const onDisconnect = () => setConnected(false);
    const onBracket = (payload: { championshipId: string; state: BracketState }) => {
      if (payload.championshipId === championshipId) setState(payload.state);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("bracket", onBracket);

    return () => {
      socket.emit("unsubscribe", championshipId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("bracket", onBracket);
      socket.disconnect();
    };
  }, [championshipId]);

  return { state, connected };
}

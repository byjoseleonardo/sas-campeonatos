"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_SCORES_BACKEND_URL ?? "http://localhost:4000";

export interface LiveMatchPatch {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  homeTeam: { id: string; name: string; shieldUrl: string | null } | null;
  awayTeam: { id: string; name: string; shieldUrl: string | null } | null;
}

/**
 * Suscribe por WebSocket a uno o varios campeonatos y devuelve los partidos en
 * vivo como un mapa (matchId → patch). Las páginas fusionan estos patches en sus
 * partidos cargados inicialmente por REST. 100% WebSocket (sin polling).
 */
export function useLiveMatches(championshipIds: string[]) {
  const [patches, setPatches] = useState<Record<string, LiveMatchPatch>>({});
  const [connected, setConnected] = useState(false);

  // Clave estable para evitar reconexiones por nuevas referencias de array
  const key = [...new Set(championshipIds.filter(Boolean))].sort().join(",");

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");

    const socket: Socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    const onConnect = () => {
      setConnected(true);
      ids.forEach((id) => socket.emit("subscribe", id));
    };
    const onDisconnect = () => setConnected(false);
    const onMatches = (payload: { championshipId: string; matches: LiveMatchPatch[] }) => {
      setPatches((prev) => {
        const next = { ...prev };
        for (const m of payload.matches) next[m.id] = m;
        return next;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("matches", onMatches);

    return () => {
      ids.forEach((id) => socket.emit("unsubscribe", id));
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("matches", onMatches);
      socket.disconnect();
    };
  }, [key]);

  return { patches, connected };
}

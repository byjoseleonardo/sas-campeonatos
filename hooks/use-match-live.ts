"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_SCORES_BACKEND_URL ?? "http://localhost:4000";

interface Player { id: string; firstName: string; paternalLastName: string }
interface Team   { id: string; name: string }

export interface LiveEvent {
  id: string;
  eventType: string;
  minute: number;
  team: Team;
  player: Player;
}

export interface LiveSet {
  setNumber: number;
  homePoints: number;
  awayPoints: number;
  status: string;
  winnerTeamId: string | null;
}

export interface LiveMatch {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  championship: { id: string; name: string };
  phase: { id: string; name: string } | null;
  roundLabel: string | null;
  venue: string | null;
  streamUrl?: string | null;
  scheduledAt: string | null;
  events: LiveEvent[];
  // Vóley
  sport?: string;
  currentSet?: number | null;
  sets?: LiveSet[];
}

/**
 * Estado de un partido en vivo vía WebSocket (scores-backend). El servidor
 * empuja el estado completo al suscribirse y cada vez que cambia (sin polling).
 * Reemplaza al SSE de Supabase realtime.
 */
export function useMatchLive(matchId: string) {
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    const socket: Socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    const onConnect = () => {
      setConnected(true);
      socket.emit("subscribe:match", matchId);
    };
    const onDisconnect = () => setConnected(false);
    const onState = (payload: { matchId: string; match: LiveMatch | null }) => {
      if (payload.matchId === matchId) setMatch(payload.match);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("match:state", onState);

    return () => {
      socket.emit("unsubscribe:match", matchId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("match:state", onState);
      socket.disconnect();
    };
  }, [matchId]);

  return { match, connected };
}

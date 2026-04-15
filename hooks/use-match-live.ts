"use client";

import { useEffect, useState } from "react";

interface Player { id: string; firstName: string; paternalLastName: string }
interface Team   { id: string; name: string }

export interface LiveEvent {
  id: string;
  eventType: string;
  minute: number;
  team: Team;
  player: Player;
}

export interface LiveMatch {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  championship: { id: string; name: string };
  phase: { id: string; name: string } | null;
  roundLabel: string | null;
  venue: string | null;
  scheduledAt: string | null;
  events: LiveEvent[];
}

export function useMatchLive(matchId: string) {
  const [match, setMatch]   = useState<LiveMatch | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/matches/${matchId}/live`);

    es.addEventListener("init", (e) => {
      setMatch(JSON.parse(e.data));
      setConnected(true);
    });

    es.addEventListener("match_updated", (e) => {
      const updated = JSON.parse(e.data);
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              status:    updated.status,
              homeScore: updated.homeScore,
              awayScore: updated.awayScore,
            }
          : prev
      );
    });

    es.addEventListener("event_added", (e) => {
      const newEvent = JSON.parse(e.data);
      setMatch((prev) =>
        prev
          ? { ...prev, events: [...prev.events, newEvent].sort((a, b) => a.minute - b.minute) }
          : prev
      );
    });

    es.addEventListener("event_removed", (e) => {
      const removed = JSON.parse(e.data);
      setMatch((prev) =>
        prev
          ? { ...prev, events: prev.events.filter((ev) => ev.id !== removed.id) }
          : prev
      );
    });

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [matchId]);

  return { match, connected };
}

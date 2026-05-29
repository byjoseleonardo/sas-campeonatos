"use client";

import { useEffect, useState } from "react";

export interface BracketTeam {
  id: string;
  name: string;
  shieldUrl: string | null;
}

export interface BracketMatchState {
  id: string;
  round: string;
  roundLabel: string | null;
  status: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  scheduledAt: string | null;
  venue: string | null;
  homeTeam: BracketTeam | null;
  awayTeam: BracketTeam | null;
}

export interface BracketState {
  semifinals: BracketMatchState[];
  final: BracketMatchState | null;
  thirdPlace: BracketMatchState | null;
}

/**
 * Polling simple del estado de la llave. Se reemplazará por el stream del
 * backend Node de tiempo real cuando esté disponible (repo paralelo).
 */
export function useBracketPoll(championshipId: string | null, intervalMs = 12000) {
  const [state, setState] = useState<BracketState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!championshipId) return;
    let cancelled = false;
    let first = true;

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/championships/${championshipId}/bracket`, {
          cache: "no-store",
        });
        if (!cancelled && res.ok) setState(await res.json());
      } catch {
        // mantener el último estado conocido
      } finally {
        if (!cancelled && first) {
          first = false;
          setLoading(false);
        }
      }
    };

    fetchState();
    const iv = setInterval(fetchState, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [championshipId, intervalMs]);

  return { state, loading };
}

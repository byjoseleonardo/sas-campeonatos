import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { MatchRound } from "@/lib/generated/prisma/enums";

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de llaves (bracket) de eliminación: 2 semifinales → final + 3er puesto
// ─────────────────────────────────────────────────────────────────────────────

export const BRACKET_ROUNDS: MatchRound[] = [
  MatchRound.semifinal,
  MatchRound.tercer_puesto,
  MatchRound.final,
];

/** Campos del match necesarios para propagar la llave al finalizar. */
export interface AdvanceableMatch {
  round: MatchRound;
  nextMatchId: string | null;
  nextMatchSlot: string | null;
  loserNextMatchId: string | null;
  loserNextMatchSlot: string | null;
}

/**
 * Propaga el resultado de una semifinal: el GANADOR pasa a la final y el
 * PERDEDOR al partido de tercer puesto, cada uno en su slot fijo (home/away).
 *
 * - Idempotente: solo escribe el slot si está vacío (where slot = null), por lo
 *   que re-finalizar o un doble click nunca pisa un equipo ya colocado.
 * - Solo las semifinales propagan; final y tercer puesto no tienen destino.
 *
 * Debe ejecutarse dentro de una transacción (tx).
 */
export async function advanceBracket(
  tx: Prisma.TransactionClient,
  match: AdvanceableMatch,
  winnerTeamId: string,
  loserTeamId: string
): Promise<void> {
  if (match.round !== MatchRound.semifinal) return;

  // Ganador → final
  if (match.nextMatchId && match.nextMatchSlot) {
    const field = match.nextMatchSlot === "away" ? "awayTeamId" : "homeTeamId";
    await tx.match.updateMany({
      where: { id: match.nextMatchId, [field]: null },
      data: { [field]: winnerTeamId },
    });
  }

  // Perdedor → tercer puesto
  if (match.loserNextMatchId && match.loserNextMatchSlot) {
    const field = match.loserNextMatchSlot === "away" ? "awayTeamId" : "homeTeamId";
    await tx.match.updateMany({
      where: { id: match.loserNextMatchId, [field]: null },
      data: { [field]: loserTeamId },
    });
  }
}

/**
 * Reasigna un slot del partido destino al equipo correcto. Si el partido destino
 * ya tenía otro equipo y además ya se había jugado, lo REINICIA (marcador,
 * estado y eventos) porque sus participantes cambiaron.
 */
async function applySlot(
  tx: Prisma.TransactionClient,
  targetId: string | null,
  slot: string | null,
  teamId: string
): Promise<void> {
  if (!targetId || !slot) return;
  const target = await tx.match.findUnique({
    where: { id: targetId },
    select: { homeTeamId: true, awayTeamId: true, status: true },
  });
  if (!target) return;

  const field: "homeTeamId" | "awayTeamId" = slot === "away" ? "awayTeamId" : "homeTeamId";
  const currentVal = field === "awayTeamId" ? target.awayTeamId : target.homeTeamId;
  if (currentVal === teamId) return; // ya está correcto, nada que hacer

  const wasPlayed = target.status !== "programado";
  await tx.match.update({
    where: { id: targetId },
    data: {
      [field]: teamId,
      ...(wasPlayed && {
        status: "programado",
        homeScore: 0,
        awayScore: 0,
        winnerTeamId: null,
        startedAt: null,
        endedAt: null,
      }),
    },
  });
  if (wasPlayed) {
    await tx.matchEvent.deleteMany({ where: { matchId: targetId } });
  }
}

/**
 * Re-propaga una semifinal CORREGIDA: sobrescribe el slot del ganador en la final
 * y el del perdedor en el tercer puesto (a diferencia de advanceBracket, que solo
 * llena slots vacíos). Si la final/3er puesto ya se jugaron con el equipo
 * equivocado, se reinician. Debe ejecutarse dentro de una transacción.
 */
export async function repropagateBracket(
  tx: Prisma.TransactionClient,
  match: AdvanceableMatch,
  winnerTeamId: string,
  loserTeamId: string
): Promise<void> {
  if (match.round !== MatchRound.semifinal) return;
  await applySlot(tx, match.nextMatchId, match.nextMatchSlot, winnerTeamId);
  await applySlot(tx, match.loserNextMatchId, match.loserNextMatchSlot, loserTeamId);
}

/**
 * Estado de la llave de un campeonato (semis + final + 3er puesto), serializable.
 * Lo consumen la vista TV (polling) y el backend de tiempo real externo.
 */
export async function getBracketState(championshipId: string) {
  const matches = await prisma.match.findMany({
    where: {
      championshipId,
      round: { in: BRACKET_ROUNDS },
    },
    select: {
      id: true,
      round: true,
      roundLabel: true,
      status: true,
      homeScore: true,
      awayScore: true,
      winnerTeamId: true,
      scheduledAt: true,
      venue: true,
      homeTeam: { select: { id: true, name: true, shieldUrl: true } },
      awayTeam: { select: { id: true, name: true, shieldUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byRound = (r: MatchRound) => matches.filter((m) => m.round === r);

  return {
    semifinals: byRound(MatchRound.semifinal),
    final: byRound(MatchRound.final)[0] ?? null,
    thirdPlace: byRound(MatchRound.tercer_puesto)[0] ?? null,
  };
}

export type BracketState = Awaited<ReturnType<typeof getBracketState>>;

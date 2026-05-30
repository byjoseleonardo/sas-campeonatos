// Reglas del marcador de vóley por sets. Funciones PURAS (sin DB), reutilizables
// y testeables. Las consume la API de registrar punto y la consola de mesa.

export interface VolleyConfig {
  setsToWin: number;                  // 2 = al mejor de 3, 3 = al mejor de 5
  pointsPerSet: number;               // puntos objetivo de los sets normales (ej. 25)
  decidingSetPoints: number | null;   // puntaje del set decisivo si difiere (ej. 15); null = igual
  winByMargin: number;                // ventaja mínima para cerrar el set (ej. 2)
  capPoints: number | null;           // tope opcional: cierra al alcanzarlo sin importar la ventaja
}

export const VOLLEY_DEFAULTS: VolleyConfig = {
  setsToWin: 3,
  pointsPerSet: 25,
  decidingSetPoints: 15,
  winByMargin: 2,
  capPoints: null,
};

export type SetWinner = "home" | "away" | null;

/** El set decisivo es el último posible: 2*setsToWin - 1 (ej. 5º a mejor de 5). */
export function isDecidingSet(setNumber: number, setsToWin: number): boolean {
  return setNumber === 2 * setsToWin - 1;
}

/** Puntos objetivo del set N (usa el decisivo solo si está configurado distinto). */
export function targetForSet(setNumber: number, cfg: VolleyConfig): number {
  if (cfg.decidingSetPoints != null && isDecidingSet(setNumber, cfg.setsToWin)) {
    return cfg.decidingSetPoints;
  }
  return cfg.pointsPerSet;
}

/**
 * ¿Terminó el set? Cierra si alguien llegó al objetivo con la ventaja mínima,
 * o si se alcanzó el tope (`capPoints`). Devuelve el ganador del set.
 */
export function setOutcome(
  homePoints: number,
  awayPoints: number,
  setNumber: number,
  cfg: VolleyConfig
): { over: boolean; winner: SetWinner } {
  const target = targetForSet(setNumber, cfg);
  const margin = cfg.winByMargin ?? 2;
  const hi = Math.max(homePoints, awayPoints);
  const lo = Math.min(homePoints, awayPoints);
  const leader: SetWinner =
    homePoints > awayPoints ? "home" : awayPoints > homePoints ? "away" : null;

  if (!leader) return { over: false, winner: null };

  // Tope: cierra apenas el líder lo alcanza (sin exigir la ventaja).
  if (cfg.capPoints != null && hi >= cfg.capPoints) {
    return { over: true, winner: leader };
  }
  // Regla normal: llegar al objetivo con ventaja >= margin.
  if (hi >= target && hi - lo >= margin) {
    return { over: true, winner: leader };
  }
  return { over: false, winner: null };
}

/** Sets ganados por cada lado, contando solo los sets ya finalizados. */
export function setsWonFrom(
  sets: { status: string; winner: SetWinner }[]
): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const s of sets) {
    if (s.status !== "finalizado") continue;
    if (s.winner === "home") home++;
    else if (s.winner === "away") away++;
  }
  return { home, away };
}

/** ¿Terminó el partido? (alguien llegó a `setsToWin`). */
export function matchOutcome(
  setsWon: { home: number; away: number },
  setsToWin: number
): { over: boolean; winner: SetWinner } {
  if (setsWon.home >= setsToWin) return { over: true, winner: "home" };
  if (setsWon.away >= setsToWin) return { over: true, winner: "away" };
  return { over: false, winner: null };
}

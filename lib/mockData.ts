export const championships = [
  { id: "1", name: "COPA PRIMAVERA 2026", sport: "Fútbol", format: "Fase de grupos + eliminación", status: "activo" as const, teams: 16, date: "Mar 2026", location: "Estadio Central" },
  { id: "2", name: "LIGA INTERBARRIAL", sport: "Baloncesto", format: "Liga (todos contra todos)", status: "inscripciones" as const, teams: 8, date: "Abr 2026", location: "Coliseo Municipal" },
  { id: "3", name: "TORNEO RELÁMPAGO", sport: "Voleibol", format: "Eliminación directa", status: "finalizado" as const, teams: 12, date: "Feb 2026", location: "Polideportivo Norte" },
  { id: "4", name: "COPA NOCTURNA", sport: "Futsal", format: "Fase de grupos + eliminación", status: "activo" as const, teams: 20, date: "Mar 2026", location: "Cancha Sintética Sur" },
  { id: "5", name: "LIGA FEMENINA 2026", sport: "Fútbol", format: "Liga (todos contra todos)", status: "inscripciones" as const, teams: 10, date: "May 2026", location: "Complejo Deportivo" },
  { id: "6", name: "TORNEO MASTERS +40", sport: "Fútbol", format: "Eliminación directa", status: "finalizado" as const, teams: 8, date: "Ene 2026", location: "Campo Viejo" },
];

export const matches = [
  { homeTeam: "Águilas FC", awayTeam: "Leones SC", homeScore: 3, awayScore: 1, date: "13 Mar 2026", time: "19:00", championship: "Copa Primavera 2026", championshipId: "1", status: "finalizado" as const, jornada: 1 },
  { homeTeam: "Tigres United", awayTeam: "Panteras BC", date: "14 Mar 2026", time: "20:30", championship: "Liga Interbarrial", championshipId: "2", status: "programado" as const, jornada: 1 },
  { homeTeam: "Halcones", awayTeam: "Cóndores", homeScore: 2, awayScore: 2, date: "13 Mar 2026", time: "21:00", championship: "Copa Nocturna", championshipId: "4", status: "en_vivo" as const, jornada: 1 },
  { homeTeam: "Rayos FC", awayTeam: "Truenos SC", homeScore: 0, awayScore: 2, date: "12 Mar 2026", time: "18:00", championship: "Copa Primavera 2026", championshipId: "1", status: "finalizado" as const, jornada: 1 },
  { homeTeam: "Estrellas", awayTeam: "Cometas", date: "15 Mar 2026", time: "17:00", championship: "Liga Femenina 2026", championshipId: "5", status: "programado" as const, jornada: 1 },
  { homeTeam: "Vikingos", awayTeam: "Gladiadores", homeScore: 1, awayScore: 3, date: "11 Mar 2026", time: "20:00", championship: "Torneo Relámpago", championshipId: "3", status: "finalizado" as const, jornada: 1 },
  // Jornada 2 - Copa Primavera
  { homeTeam: "Leones SC", awayTeam: "Rayos FC", homeScore: 2, awayScore: 0, date: "20 Mar 2026", time: "19:00", championship: "Copa Primavera 2026", championshipId: "1", status: "finalizado" as const, jornada: 2 },
  { homeTeam: "Truenos SC", awayTeam: "Águilas FC", homeScore: 1, awayScore: 1, date: "20 Mar 2026", time: "21:00", championship: "Copa Primavera 2026", championshipId: "1", status: "finalizado" as const, jornada: 2 },
  // Jornada 3 - Copa Primavera
  { homeTeam: "Águilas FC", awayTeam: "Rayos FC", date: "27 Mar 2026", time: "19:00", championship: "Copa Primavera 2026", championshipId: "1", status: "programado" as const, jornada: 3 },
  { homeTeam: "Leones SC", awayTeam: "Truenos SC", date: "27 Mar 2026", time: "21:00", championship: "Copa Primavera 2026", championshipId: "1", status: "programado" as const, jornada: 3 },
];

export const teams = [
  { id: "1", name: "Águilas FC", sport: "Fútbol", players: 22, championship: "Copa Primavera 2026", championshipId: "1" },
  { id: "2", name: "Leones SC", sport: "Fútbol", players: 20, championship: "Copa Primavera 2026", championshipId: "1" },
  { id: "3", name: "Tigres United", sport: "Baloncesto", players: 12, championship: "Liga Interbarrial", championshipId: "2" },
  { id: "4", name: "Panteras BC", sport: "Baloncesto", players: 10, championship: "Liga Interbarrial", championshipId: "2" },
  { id: "5", name: "Halcones", sport: "Futsal", players: 14, championship: "Copa Nocturna", championshipId: "4" },
  { id: "6", name: "Cóndores", sport: "Futsal", players: 12, championship: "Copa Nocturna", championshipId: "4" },
  { id: "7", name: "Rayos FC", sport: "Fútbol", players: 18, championship: "Copa Primavera 2026", championshipId: "1" },
  { id: "8", name: "Estrellas", sport: "Fútbol", players: 20, championship: "Liga Femenina 2026", championshipId: "5" },
  { id: "9", name: "Truenos SC", sport: "Fútbol", players: 19, championship: "Copa Primavera 2026", championshipId: "1" },
];

export interface StandingRow {
  team: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

// Standings for Copa Primavera 2026 (after jornada 2)
export const standings: Record<string, StandingRow[]> = {
  "1": [
    { team: "Águilas FC", pj: 2, pg: 1, pe: 1, pp: 0, gf: 4, gc: 2, dg: 2, pts: 4 },
    { team: "Leones SC", pj: 2, pg: 1, pe: 0, pp: 1, gf: 3, gc: 3, dg: 0, pts: 3 },
    { team: "Truenos SC", pj: 2, pg: 1, pe: 1, pp: 0, gf: 3, gc: 1, dg: 2, pts: 4 },
    { team: "Rayos FC", pj: 2, pg: 0, pe: 0, pp: 2, gf: 0, gc: 4, dg: -4, pts: 0 },
  ].sort((a, b) => b.pts - a.pts || b.dg - a.dg),
};

export interface BracketMatch {
  id: string;
  round: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore?: number;
  awayScore?: number;
  status: "programado" | "finalizado";
}

export const brackets: Record<string, BracketMatch[]> = {
  "3": [
    { id: "qf1", round: "Cuartos", homeTeam: "Vikingos", awayTeam: "Gladiadores", homeScore: 1, awayScore: 3, status: "finalizado" },
    { id: "qf2", round: "Cuartos", homeTeam: "Dragones", awayTeam: "Fénix", homeScore: 2, awayScore: 0, status: "finalizado" },
    { id: "qf3", round: "Cuartos", homeTeam: "Titanes", awayTeam: "Centauros", homeScore: 3, awayScore: 2, status: "finalizado" },
    { id: "qf4", round: "Cuartos", homeTeam: "Espartanos", awayTeam: "Guerreros", homeScore: 1, awayScore: 4, status: "finalizado" },
    { id: "sf1", round: "Semifinal", homeTeam: "Gladiadores", awayTeam: "Dragones", homeScore: 2, awayScore: 1, status: "finalizado" },
    { id: "sf2", round: "Semifinal", homeTeam: "Titanes", awayTeam: "Guerreros", homeScore: 0, awayScore: 2, status: "finalizado" },
    { id: "f1", round: "Final", homeTeam: "Gladiadores", awayTeam: "Guerreros", homeScore: 3, awayScore: 1, status: "finalizado" },
  ],
};

// Selección Prisma compartida del estado de vóley que devuelven las rutas
// start/point y que consume la consola de mesa técnica.
export const volleySelect = {
  id: true,
  status: true,
  homeScore: true, // = sets ganados local
  awayScore: true, // = sets ganados visitante
  currentSet: true,
  winnerTeamId: true,
  setsToWin: true,
  pointsPerSet: true,
  decidingSetPoints: true,
  winByMargin: true,
  capPoints: true,
  homeTeam: { select: { id: true, name: true } },
  awayTeam: { select: { id: true, name: true } },
  sets: {
    orderBy: { setNumber: "asc" as const },
    select: { setNumber: true, homePoints: true, awayPoints: true, status: true, winnerTeamId: true },
  },
} as const;

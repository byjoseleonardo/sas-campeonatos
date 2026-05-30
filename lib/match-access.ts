import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";

/**
 * Verifica que el usuario sea técnico de mesa asignado al campeonato del partido.
 * Devuelve `{ championshipId }` si tiene acceso, o `null` si no.
 * Compartido por las rutas de mesa técnica (fútbol y vóley).
 */
export async function canAccessMatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { championshipId: true },
  });
  if (!match) return null;
  const role = await prisma.userRole.findFirst({
    where: { userId, role: Role.tecnico_mesa, championshipId: match.championshipId },
  });
  return role ? match : null;
}

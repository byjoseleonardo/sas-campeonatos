import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// DELETE /api/championships/[id]/teams/[teamId]/roster/[entryId]
// Solo admin u organizador pueden eliminar. Solo si el campeonato no ha iniciado.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string; entryId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id, teamId, entryId } = await params;

  // Solo el organizador dueño del campeonato puede eliminar jugadores
  const isOrg = await prisma.userRole.findFirst({
    where: { userId: session.user.id, role: "organizador", championshipId: id },
  });
  if (!isOrg) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Verificar que el campeonato no ha iniciado
  const championship = await prisma.championship.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!championship) {
    return NextResponse.json({ error: "Campeonato no encontrado" }, { status: 404 });
  }
  if (championship.status === "en_curso" || championship.status === "finalizado") {
    return NextResponse.json(
      { error: "No se pueden eliminar jugadores de un campeonato en curso o finalizado" },
      { status: 400 }
    );
  }

  // Verificar que la entrada pertenece al equipo
  const entry = await prisma.rosterEntry.findFirst({
    where: { id: entryId, teamId },
  });
  if (!entry) {
    return NextResponse.json({ error: "Jugador no encontrado en este equipo" }, { status: 404 });
  }

  await prisma.rosterEntry.delete({ where: { id: entryId } });

  return NextResponse.json({ ok: true });
}

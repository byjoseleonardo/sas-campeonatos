import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// DELETE /api/delegado/team/[teamId]/roster/[entryId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string; entryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { teamId, entryId } = await params;

    // Verificar que el equipo pertenece al delegado
    const team = await prisma.team.findFirst({
      where: { id: teamId, delegateId: session.user.id },
    });
    if (!team) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    const entry = await prisma.rosterEntry.findFirst({
      where: { id: entryId, teamId },
    });
    if (!entry) {
      return NextResponse.json({ error: "Jugador no encontrado en el plantel" }, { status: 404 });
    }

    // Solo se puede eliminar si está en estado pendiente
    if (entry.status !== "pendiente") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar jugadores en estado pendiente" },
        { status: 400 }
      );
    }

    await prisma.rosterEntry.delete({ where: { id: entryId } });

    return NextResponse.json({ message: "Jugador eliminado del plantel" });
  } catch (error) {
    console.error("[DELETE /api/delegado/team/[teamId]/roster/[entryId]]", error);
    return NextResponse.json({ error: "Error al eliminar jugador" }, { status: 500 });
  }
}

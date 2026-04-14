import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  // Verificar que el partido existe
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  });

  if (!match) {
    return new Response("Partido no encontrado", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Cliente desconectado
        }
      };

      // Enviar estado inicial
      const initial = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam:     { select: { id: true, name: true } },
          awayTeam:     { select: { id: true, name: true } },
          championship: { select: { id: true, name: true } },
          phase:        { select: { id: true, name: true } },
          events: {
            include: {
              player: { select: { id: true, firstName: true, paternalLastName: true } },
              team:   { select: { id: true, name: true } },
            },
            orderBy: { minute: "asc" },
          },
        },
      });

      send("init", initial);

      // Suscribirse a cambios en el partido (marcador, estado)
      const matchChannel = supabaseServer
        .channel(`match-${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matches",
            filter: `id=eq.${matchId}`,
          },
          (payload) => send("match_updated", payload.new)
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "match_events",
            filter: `matchId=eq.${matchId}`,
          },
          (payload) => send("event_added", payload.new)
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "match_events",
            filter: `matchId=eq.${matchId}`,
          },
          (payload) => send("event_removed", payload.old)
        )
        .subscribe();

      // Cleanup cuando el cliente se desconecta
      return () => {
        supabaseServer.removeChannel(matchChannel);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

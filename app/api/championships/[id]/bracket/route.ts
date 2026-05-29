import { NextRequest, NextResponse } from "next/server";
import { getBracketState } from "@/lib/bracket";

export const dynamic = "force-dynamic";

// GET /api/championships/[id]/bracket
// Estado público de la llave (semis + final + 3er puesto). Lo consumen la vista
// TV (polling) y el backend de tiempo real externo (repo Node paralelo).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const state = await getBracketState(id);
    return NextResponse.json(state);
  } catch (error) {
    console.error("[GET /championships/[id]/bracket]", error);
    return NextResponse.json({ error: "Error al obtener la llave" }, { status: 500 });
  }
}

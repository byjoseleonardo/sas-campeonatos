/**
 * backfill-fotos-cip.ts  (Fase 2)
 *
 * Recorre los jugadores sin foto (Player.photoUrl = null) y, por cada N° CIP
 * (guardado en Player.dni), consulta la API del CIP para:
 *   - descargar la foto (imagenBase64) → public/uploads/players/<cip>.jpg
 *   - corregir nombres con los campos limpios del CIP (vNombres / vPrimerApellido / vSegundoApellido)
 *
 * Es REANUDABLE e IDEMPOTENTE: por defecto solo procesa los que aún no tienen
 * foto. Si la API falla (está lenta/caída por el captcha), reintenta; vuelve a
 * correr el script las veces que haga falta hasta completar.
 *
 * Uso:
 *   npx tsx scripts/backfill-fotos-cip.ts                 # todos los que falten
 *   npx tsx scripts/backfill-fotos-cip.ts --limit=5       # solo 5 (prueba)
 *   npx tsx scripts/backfill-fotos-cip.ts --cip=100429    # un CIP puntual
 *   npx tsx scripts/backfill-fotos-cip.ts --no-names      # no tocar nombres, solo foto
 *   npx tsx scripts/backfill-fotos-cip.ts --force         # reprocesar aunque ya tengan foto
 *
 * Variables de entorno opcionales: CIP_API_URL, CIP_API_KEY, CIP_TIMEOUT_MS, CIP_RETRIES, CIP_DELAY_MS
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Config ───────────────────────────────────────────────────────
const CIP_API_URL = process.env.CIP_API_URL ?? "https://cipocr.ciphuanuco.org.pe/api/cip/consultar-completo";
const CIP_API_KEY = process.env.CIP_API_KEY ?? "b3ded10e2d93a85cf6a72316d9a37855b37688bbc20f443dc36e7c6a82d89adc";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "players");
const PUBLIC_PREFIX = "/uploads/players";

const args = process.argv.slice(2);
const argVal = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const LIMIT      = argVal("limit") ? parseInt(argVal("limit")!, 10) : undefined;
const ONLY_CIP   = argVal("cip");
const FIX_NAMES  = !args.includes("--no-names");
const FORCE      = args.includes("--force");
const TIMEOUT_MS = argVal("timeout") ? parseInt(argVal("timeout")!, 10) : Number(process.env.CIP_TIMEOUT_MS ?? 180_000);
const RETRIES    = argVal("retries") ? parseInt(argVal("retries")!, 10) : Number(process.env.CIP_RETRIES ?? 3);
const DELAY_MS   = argVal("delay")   ? parseInt(argVal("delay")!, 10)   : Number(process.env.CIP_DELAY_MS ?? 1_000);

// ─── Helpers ──────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toTitle = (s: string) => s.toLowerCase().replace(/(^|\s)([a-záéíóúñü])/g, (_m, sep, ch) => sep + ch.toUpperCase());

interface CipResponse {
  success?: boolean;
  detalle?: { vPrimerApellido?: string; vSegundoApellido?: string; vNombres?: string };
  imagenBase64?: string;
  imagenMimeType?: string;
  tieneImagen?: boolean;
}

async function fetchCip(cip: string): Promise<CipResponse | null> {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(CIP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": CIP_API_KEY },
        body: JSON.stringify({ numeroCip: cip }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) { process.stdout.write(` (HTTP ${res.status}, reintento ${attempt}/${RETRIES})`); }
      else {
        const data = (await res.json()) as CipResponse;
        if (data?.success) return data;
        return null; // respondió pero sin datos válidos
      }
    } catch {
      clearTimeout(timer);
      process.stdout.write(` (timeout/err, reintento ${attempt}/${RETRIES})`);
    }
    if (attempt < RETRIES) await sleep(2_000 * attempt); // backoff
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const where = ONLY_CIP ? { dni: ONLY_CIP } : FORCE ? {} : { photoUrl: null };
  const players = await prisma.player.findMany({
    where,
    select: { id: true, dni: true, firstName: true, paternalLastName: true, maternalLastName: true, photoUrl: true },
    orderBy: { createdAt: "asc" },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(`🖼  Backfill de fotos CIP — ${players.length} jugador(es) a procesar`);
  console.log(`   API: ${CIP_API_URL}`);
  console.log(`   timeout=${TIMEOUT_MS}ms  reintentos=${RETRIES}  corregir-nombres=${FIX_NAMES}\n`);

  let conFoto = 0, sinFoto = 0, fallidos = 0, nombresCorregidos = 0;
  const fallosCip: string[] = [];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const tag = `[${i + 1}/${players.length}] CIP ${p.dni} (${p.paternalLastName} ${p.firstName})`;
    process.stdout.write(`${tag} ...`);

    const data = await fetchCip(p.dni);
    if (!data) { console.log(" ❌ sin respuesta"); fallidos++; fallosCip.push(p.dni); await sleep(DELAY_MS); continue; }

    const update: Record<string, unknown> = {};

    // Foto
    if (data.tieneImagen && data.imagenBase64) {
      const ext = (data.imagenMimeType ?? "image/jpeg").includes("png") ? "png" : "jpg";
      const fileName = `${p.dni}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, fileName), Buffer.from(data.imagenBase64, "base64"));
      update.photoUrl = `${PUBLIC_PREFIX}/${fileName}`;
      conFoto++;
    } else {
      sinFoto++;
    }

    // Nombres (datos limpios del CIP)
    if (FIX_NAMES && data.detalle?.vNombres && data.detalle?.vPrimerApellido) {
      update.firstName = toTitle(data.detalle.vNombres);
      update.paternalLastName = toTitle(data.detalle.vPrimerApellido);
      update.maternalLastName = data.detalle.vSegundoApellido ? toTitle(data.detalle.vSegundoApellido) : null;
      nombresCorregidos++;
    }

    if (Object.keys(update).length) await prisma.player.update({ where: { id: p.id }, data: update });

    console.log(`${update.photoUrl ? " 📷 foto" : " (sin foto)"}${update.firstName ? " ✏️ nombre" : ""} ✅`);
    await sleep(DELAY_MS);
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`✅ Con foto:    ${conFoto}`);
  console.log(`⚪ Sin foto:    ${sinFoto}  (el CIP no tenía imagen)`);
  console.log(`✏️  Nombres:     ${nombresCorregidos} corregidos`);
  console.log(`❌ Fallidos:    ${fallidos}  (reintentar volviendo a correr el script)`);
  console.log("──────────────────────────────────────────");

  if (fallosCip.length) {
    const out = path.join(process.cwd(), "scripts", "data", "backfill-fallidos.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(fallosCip, null, 2), "utf8");
    console.log(`\n💾 CIPs fallidos guardados en scripts/data/backfill-fallidos.json`);
    console.log(`   Vuelve a correr el script (procesa solo los que sigan sin foto).`);
  }
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

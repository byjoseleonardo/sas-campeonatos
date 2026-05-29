/**
 * import-inscripciones.ts
 *
 * Carga automática de los 4 campeonatos CIP 2026 desde el Excel.
 * Lee scripts/data/inscripciones.json (generado del Excel) y crea bajo el
 * organizador joseleonardot115@gmail.com:
 *   - 4 campeonatos (formato personalizado)
 *   - equipos (1 por consejo departamental)
 *   - jugadores (Player.dni = N° CIP) + planillas (RosterEntry)
 *   - delegados (User + UserRole(delegado)) con contraseña temporal
 *
 * NO descarga fotos (eso es la Fase 2: scripts/backfill-fotos-cip.ts).
 * Es idempotente: correrlo de nuevo no duplica.
 *
 * Uso:  npx tsx scripts/import-inscripciones.ts
 *       npx tsx scripts/import-inscripciones.ts --dry   (solo muestra, no escribe)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Sport, ChampionshipFormat, ChampionshipStatus, Role, RosterStatus } from "../lib/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY = process.argv.includes("--dry");
const ORGANIZADOR_EMAIL = "joseleonardot115@gmail.com";

// ─── Config por disciplina ────────────────────────────────────────
interface DiscCfg { name: string; sport: Sport; gender: string | null; position: string; minJugadores: number; maxInscripciones: number; }
const DISCIPLINAS: Record<string, DiscCfg> = {
  "FULBITO LIBRE":  { name: "Fulbito Libre",  sport: Sport.futbol,   gender: "M", position: "Jugador",     minJugadores: 10, maxInscripciones: 15 },
  "FULBITO MASTER": { name: "Fulbito Master", sport: Sport.futbol,   gender: "M", position: "Jugador",     minJugadores: 10, maxInscripciones: 15 },
  "VOLEY DAMAS":    { name: "Voley Damas",    sport: Sport.voleibol, gender: "F", position: "Jugadora",    minJugadores: 6,  maxInscripciones: 14 },
  "AJEDREZ":        { name: "Ajedrez",        sport: Sport.ajedrez,  gender: null, position: "Participante", minJugadores: 1, maxInscripciones: 1 },
};
const STATUS_INICIAL = ChampionshipStatus.inscripciones;

// ─── Helpers ──────────────────────────────────────────────────────
const slugify = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

const titleCase = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, (m) => m) // keep accents
   .replace(/\b([a-záéíóúñü])/g, (c) => c.toUpperCase());

function titleCaseKeepAccents(s: string) {
  return s.toLowerCase().replace(/(^|\s|-)([a-záéíóúñü])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

// "APELLIDO_P APELLIDO_M NOMBRES"  o  "APELLIDO_P APELLIDO_M, NOMBRES"
function parseName(full: string): { firstName: string; paternalLastName: string; maternalLastName: string | null } {
  const clean = full.replace(/\s+/g, " ").trim();
  let apellidos: string, nombres: string;
  if (clean.includes(",")) {
    const [a, n] = clean.split(",");
    apellidos = a.trim(); nombres = (n || "").trim();
  } else {
    const parts = clean.split(" ");
    if (parts.length <= 2) {
      apellidos = parts[0] ?? clean; nombres = parts.slice(1).join(" ");
    } else {
      apellidos = parts.slice(0, 2).join(" "); nombres = parts.slice(2).join(" ");
    }
  }
  const apeParts = apellidos.split(" ").filter(Boolean);
  const paternal = apeParts[0] ?? clean;
  const maternal = apeParts.slice(1).join(" ") || null;
  const firstName = nombres || paternal; // fallback para no dejar vacío
  return {
    firstName: titleCaseKeepAccents(firstName),
    paternalLastName: titleCaseKeepAccents(paternal),
    maternalLastName: maternal ? titleCaseKeepAccents(maternal) : null,
  };
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(dt.getTime()) ? null : dt;
}

function genTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

interface Row {
  zona: string; disciplina: string; consejo: string; rol: string;
  apellidosNombres: string; fechaNac: string | null; edad: number | null;
  cip: string | null; habilitadoHasta: string | null; dni: string | null; celular: string | null;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const jsonPath = path.join(__dirname, "data", "inscripciones.json");
  const rows: Row[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`📄 ${rows.length} participantes leídos${DRY ? "  (DRY RUN — no escribe)" : ""}\n`);

  const organizador = await prisma.user.findUnique({ where: { email: ORGANIZADOR_EMAIL }, select: { id: true, adminId: true } });
  if (!organizador) throw new Error(`No existe el organizador ${ORGANIZADOR_EMAIL}. Corre scripts/seed-accounts.ts primero.`);
  console.log(`👤 Organizador: ${ORGANIZADOR_EMAIL}  | adminId=${organizador.adminId}\n`);

  // Agrupar: disciplina -> consejo -> filas
  const byDisc = new Map<string, Map<string, Row[]>>();
  for (const r of rows) {
    if (!r.disciplina || !r.consejo) continue;
    if (!byDisc.has(r.disciplina)) byDisc.set(r.disciplina, new Map());
    const consejos = byDisc.get(r.disciplina)!;
    if (!consejos.has(r.consejo)) consejos.set(r.consejo, []);
    consejos.get(r.consejo)!.push(r);
  }

  const credenciales: { campeonato: string; equipo: string; delegado: string; email: string; password: string }[] = [];

  for (const [disc, consejos] of byDisc) {
    const cfg = DISCIPLINAS[disc];
    if (!cfg) { console.warn(`⚠️  Disciplina sin config, omitida: ${disc}`); continue; }

    const slug = slugify(cfg.name);
    console.log(`\n🏆 ${cfg.name}  (${cfg.sport}/personalizado)  — ${consejos.size} equipos`);

    if (DRY) {
      for (const [consejo, filas] of consejos) {
        const jug = filas.filter(f => f.rol !== "DELEGADO").length;
        const del = filas.filter(f => f.rol === "DELEGADO").length;
        console.log(`   • ${titleCaseKeepAccents(consejo)}: ${jug} jugadores, ${del} delegado`);
      }
      continue;
    }

    // 1) Campeonato (upsert por slug)
    const champ = await prisma.championship.upsert({
      where: { slug },
      update: { name: cfg.name, sport: cfg.sport, format: ChampionshipFormat.personalizado, maxEquipos: consejos.size,
                minJugadores: cfg.minJugadores, maxInscripciones: cfg.maxInscripciones, adminId: organizador.adminId },
      create: { name: cfg.name, slug, sport: cfg.sport, format: ChampionshipFormat.personalizado, status: STATUS_INICIAL,
                maxEquipos: consejos.size, minJugadores: cfg.minJugadores, maxInscripciones: cfg.maxInscripciones,
                createdById: organizador.id, adminId: organizador.adminId },
    });
    // asegurar rol organizador en el campeonato
    const orgRole = await prisma.userRole.findFirst({ where: { userId: organizador.id, role: Role.organizador, championshipId: champ.id } });
    if (!orgRole) await prisma.userRole.create({ data: { userId: organizador.id, role: Role.organizador, championshipId: champ.id } });

    // 2) Equipos por consejo
    for (const [consejo, filas] of consejos) {
      const teamName = titleCaseKeepAccents(consejo);
      let team = await prisma.team.findFirst({ where: { championshipId: champ.id, name: teamName } });
      if (!team) team = await prisma.team.create({ data: { name: teamName, championshipId: champ.id } });

      // 2a) Delegado (si existe en el Excel)
      const delRow = filas.find(f => f.rol === "DELEGADO");
      if (delRow) {
        const nm = parseName(delRow.apellidosNombres);
        const email = `${slugify(consejo)}.${slug}@cip.pe`;
        let delUser = await prisma.user.findUnique({ where: { email } });
        let tempPassword = genTempPassword();
        if (!delUser) {
          const hash = await bcrypt.hash(tempPassword, 10);
          delUser = await prisma.user.create({
            data: { email, firstName: nm.firstName, paternalLastName: nm.paternalLastName, maternalLastName: nm.maternalLastName,
                    password: hash, phone: delRow.celular ?? null, dni: delRow.dni ?? null,
                    tempPassword, mustChangePassword: true, isActive: true },
          });
        } else {
          tempPassword = delUser.tempPassword ?? "(ya configurada)";
        }
        // rol delegado scoped a campeonato + equipo
        const has = await prisma.userRole.findFirst({ where: { userId: delUser.id, role: Role.delegado, championshipId: champ.id } });
        if (!has) await prisma.userRole.create({ data: { userId: delUser.id, role: Role.delegado, championshipId: champ.id, teamId: team.id } });
        // vincular equipo -> delegado
        if (team.delegateId !== delUser.id) {
          await prisma.team.update({ where: { id: team.id }, data: { delegateId: delUser.id } });
        }
        credenciales.push({ campeonato: cfg.name, equipo: teamName, delegado: `${nm.paternalLastName} ${nm.firstName}`, email, password: tempPassword });
      }

      // 2b) Jugadores / participantes -> Player + RosterEntry
      const jugadores = filas.filter(f => f.rol !== "DELEGADO" && f.cip);
      // números de camiseta ya usados
      const usados = new Set((await prisma.rosterEntry.findMany({ where: { teamId: team.id }, select: { number: true } })).map(r => r.number));
      let numero = 1;
      for (const j of jugadores) {
        const nm = parseName(j.apellidosNombres);
        const player = await prisma.player.upsert({
          where: { dni: j.cip! },           // dni guarda el N° CIP
          update: { firstName: nm.firstName, paternalLastName: nm.paternalLastName, maternalLastName: nm.maternalLastName },
          create: { dni: j.cip!, firstName: nm.firstName, paternalLastName: nm.paternalLastName, maternalLastName: nm.maternalLastName,
                    birthDate: parseDate(j.fechaNac), gender: cfg.gender, phone: j.celular ?? null },
        });
        const existe = await prisma.rosterEntry.findFirst({ where: { teamId: team.id, playerId: player.id } });
        if (!existe) {
          while (usados.has(numero)) numero++;
          usados.add(numero);
          await prisma.rosterEntry.create({
            data: { playerId: player.id, teamId: team.id, number: numero, position: cfg.position, status: RosterStatus.inscrito },
          });
          numero++;
        }
      }
      console.log(`   ✅ ${teamName}: ${jugadores.length} jugadores${delRow ? " + delegado" : ""}`);
    }
  }

  if (!DRY && credenciales.length) {
    console.log("\n══════════════════ CREDENCIALES DE DELEGADOS ══════════════════");
    console.log("(contraseña temporal — el delegado debe cambiarla al ingresar)\n");
    for (const c of credenciales) {
      console.log(`  ${c.campeonato} | ${c.equipo}`);
      console.log(`     ${c.delegado}  →  ${c.email}  /  ${c.password}`);
    }
    // guardar a archivo para distribuir
    const outDir = path.join(__dirname, "data");
    fs.writeFileSync(path.join(outDir, "credenciales-delegados.json"), JSON.stringify(credenciales, null, 2), "utf8");
    console.log(`\n💾 Guardado en scripts/data/credenciales-delegados.json`);
  }

  console.log("\n✅ Importación completada.");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

-- Baseline migration: represents the full current state of the database schema.
-- This migration should NOT be executed on production (mark as applied with --resolve).
-- Run: npx prisma migrate resolve --applied 20260415165304_baseline

-- Enums
CREATE TYPE "Role" AS ENUM ('superadministrador', 'administrador', 'organizador', 'supervisor', 'tecnico_mesa', 'delegado');
CREATE TYPE "ChampionshipStatus" AS ENUM ('borrador', 'inscripciones', 'en_curso', 'finalizado');
CREATE TYPE "ChampionshipFormat" AS ENUM ('liga', 'eliminacion', 'grupos_eliminacion', 'personalizado');
CREATE TYPE "PhaseType" AS ENUM ('todos_contra_todos', 'grupos', 'eliminacion', 'final');
CREATE TYPE "EliminacionRound" AS ENUM ('dieciseisavos', 'octavos', 'cuartos', 'semifinal');
CREATE TYPE "Sport" AS ENUM ('futbol', 'futsal', 'baloncesto', 'voleibol');
CREATE TYPE "TeamStatus" AS ENUM ('activo', 'descalificado', 'retirado');
CREATE TYPE "PlayerStatus" AS ENUM ('activo', 'suspendido', 'inhabilitado');
CREATE TYPE "RosterStatus" AS ENUM ('pendiente', 'inscrito', 'rechazado');
CREATE TYPE "MatchStatus" AS ENUM ('programado', 'en_curso', 'finalizado', 'suspendido', 'postergado');
CREATE TYPE "EventType" AS ENUM ('gol', 'gol_en_contra', 'amarilla', 'roja', 'roja_directa', 'cambio');
CREATE TYPE "MatchRound" AS ENUM ('fase_grupos', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final');

-- Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "paternalLastName" TEXT NOT NULL,
    "maternalLastName" TEXT,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "dni" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "tempPassword" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");
ALTER TABLE "users" ADD CONSTRAINT "users_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User Roles
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "championshipId" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_roles_userId_role_championshipId_key" ON "user_roles"("userId", "role", "championshipId");
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Championships
CREATE TABLE "championships" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "status" "ChampionshipStatus" NOT NULL DEFAULT 'borrador',
    "format" "ChampionshipFormat" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "maxEquipos" INTEGER NOT NULL DEFAULT 0,
    "minJugadores" INTEGER NOT NULL,
    "matchDurationMin" INTEGER NOT NULL DEFAULT 90,
    "maxInscripciones" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "championships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "championships_slug_key" ON "championships"("slug");
ALTER TABLE "championships" ADD CONSTRAINT "championships_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "championships" ADD CONSTRAINT "championships_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Phases
CREATE TABLE "phases" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PhaseType" NOT NULL,
    "order" INTEGER NOT NULL,
    "legsPerMatch" INTEGER NOT NULL DEFAULT 1,
    "numGroups" INTEGER,
    "teamsPerGroup" INTEGER,
    "teamsAdvance" INTEGER,
    "startingRound" "EliminacionRound",
    "hasThirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "phases_championshipId_order_key" ON "phases"("championshipId", "order");
ALTER TABLE "phases" ADD CONSTRAINT "phases_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase Qualifiers
CREATE TABLE "phase_qualifiers" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupName" TEXT,
    "position" INTEGER NOT NULL,
    CONSTRAINT "phase_qualifiers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "phase_qualifiers_phaseId_teamId_key" ON "phase_qualifiers"("phaseId", "teamId");
ALTER TABLE "phase_qualifiers" ADD CONSTRAINT "phase_qualifiers_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Teams
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shieldUrl" TEXT,
    "colorPrimary" TEXT,
    "colorSecondary" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'activo',
    "championshipId" TEXT NOT NULL,
    "delegateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "teams_name_championshipId_key" ON "teams"("name", "championshipId");
ALTER TABLE "teams" ADD CONSTRAINT "teams_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phase_qualifiers" ADD CONSTRAINT "phase_qualifiers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Players
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "paternalLastName" TEXT NOT NULL,
    "maternalLastName" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "photoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "players_dni_key" ON "players"("dni");

-- Roster Entries
CREATE TABLE "roster_entries" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "status" "RosterStatus" NOT NULL DEFAULT 'pendiente',
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roster_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roster_entries_playerId_teamId_key" ON "roster_entries"("playerId", "teamId");
CREATE UNIQUE INDEX "roster_entries_teamId_number_key" ON "roster_entries"("teamId", "number");
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Jornadas
CREATE TABLE "jornadas" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "jornadas_championshipId_number_key" ON "jornadas"("championshipId", "number");
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Groups
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "groups_championshipId_name_key" ON "groups"("championshipId", "name");
ALTER TABLE "groups" ADD CONSTRAINT "groups_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Group Teams
CREATE TABLE "group_teams" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    CONSTRAINT "group_teams_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "group_teams_groupId_teamId_key" ON "group_teams"("groupId", "teamId");
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Matches
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "jordanaId" TEXT,
    "groupId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "venue" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'programado',
    "round" "MatchRound" NOT NULL DEFAULT 'fase_grupos',
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "currentMinute" INTEGER,
    "phaseId" TEXT,
    "roundLabel" TEXT,
    "tecnicoId" TEXT,
    "supervisorId" TEXT,
    "nextMatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "matches" ADD CONSTRAINT "matches_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_jordanaId_fkey" FOREIGN KEY ("jordanaId") REFERENCES "jornadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Match Events
CREATE TABLE "match_events" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "minute" INTEGER NOT NULL,
    "playerOutId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_playerOutId_fkey" FOREIGN KEY ("playerOutId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Standings
CREATE TABLE "standings" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDifference" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "standings_championshipId_teamId_groupId_key" ON "standings"("championshipId", "teamId", "groupId");
ALTER TABLE "standings" ADD CONSTRAINT "standings_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "championships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "standings" ADD CONSTRAINT "standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Suspensions
CREATE TABLE "suspensions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "matchesSuspended" INTEGER NOT NULL DEFAULT 1,
    "matchesServed" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suspensions_pkey" PRIMARY KEY ("id")
);

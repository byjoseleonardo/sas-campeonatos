# ChampZone — Sistema de Gestión de Campeonatos

Plataforma web para la gestión de campeonatos deportivos. Permite administrar equipos, partidos, fases, resultados y roles de usuario. Incluye un portal para técnicos de mesa y vistas públicas de resultados en vivo.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Base de datos:** PostgreSQL (local) / Supabase (producción)
- **ORM:** Prisma
- **Auth:** NextAuth.js v5
- **UI:** Tailwind CSS + shadcn/ui

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| `superadmin` | Gestión de admins y plataforma global |
| `admin` | Gestión de su campeonato (equipos, partidos, fases) |
| `tecnico_mesa` | Control de partidos asignados (iniciar, eventos, finalizar) |
| Público | Vista de resultados en vivo (sin auth) |

## Levantar el proyecto en local

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Requiere un `.env` con:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

---

## Plan de trabajo — 2026-04-13

### ✅ Resuelto hoy
- Migración `20260408000000_simplify_player_config` marcada como aplicada (`prisma migrate resolve --applied`)
- Revisión del módulo `tecnico_mesa`: estado completo y funcional

### 🔧 En progreso / Pendiente

#### ~~1. Quitar polling del portal técnico~~ ✅ Completado (incluido en punto 3)
- Eliminar el `setInterval` de 15s en `app/tecnico/partidos/[matchId]/page.tsx`
- El técnico es el único que modifica el partido, por lo que `fetchMatch()` post-acción es suficiente
- **Sin regresiones:** cada acción (iniciar, evento, walkover, finalizar) ya llama `fetchMatch()`

#### ~~2. SSE para resultados públicos en vivo~~ ✅ Completado

#### ~~4. Vistas públicas — campeonatos con datos reales~~ ✅ Completado
- `GET /api/public/championships` — lista sin borradores
- `GET /api/public/championships/[id]` — detalle + fixture agrupado + equipos
- `/campeonatos` migrada de mockData a DB real
- `/campeonatos/[id]` migrada de mockData a DB real, fixture agrupado por fase/jornada/grupo, cada partido linkea a la vista en vivo

#### 2. SSE para resultados públicos en vivo
Implementar Server-Sent Events (SSE) para que el público reciba actualizaciones automáticas sin polling ni WebSockets.

**Por qué SSE y no WebSocket:**
- La comunicación es unidireccional: servidor → cliente
- El técnico emite cambios via HTTP normal (POST/PATCH), el público solo recibe
- SSE es HTTP nativo, funciona sin infraestructura extra en Next.js
- Reconexión automática incluida en el protocolo

**Arquitectura:**
```
Técnico → POST/PATCH /api/tecnico/matches/[matchId]
                    ↓
            API actualiza DB y emite evento SSE
                    ↓
GET /api/matches/[matchId]/live  ←  Público suscrito recibe la actualización
```

**Archivos a crear/modificar:**
- `app/api/matches/[matchId]/live/route.ts` — endpoint SSE
- `app/partidos/[matchId]/live/page.tsx` — vista pública de resultados en vivo
- `app/api/tecnico/matches/[matchId]/route.ts` — emitir SSE tras cada PATCH
- `app/api/tecnico/matches/[matchId]/events/route.ts` — emitir SSE tras POST de evento

**Mecanismo de emisión:**
- Se evaluará usar Supabase Realtime como backend de eventos (el endpoint SSE se suscribe a Supabase y reenvía al cliente), evitando dependencias de estado en memoria que no escalan en producción.

#### ~~3. Rediseño UI — Portal técnico (gestión de partido)~~ ✅ Completado
Rediseño completo de `app/tecnico/partidos/[matchId]/page.tsx` basado en referencia visual.

**Cambios respecto al diseño actual:**

| Actual | Nuevo |
|--------|-------|
| Dialog con dropdowns para registrar evento | Botones directos Gol / Amarilla / Roja por equipo |
| Vista única | Tabs: **Planilla** y **Control** |
| Lista de eventos simple | Timeline 3 columnas: Local \| Evento \| Visitante |
| Controles mezclados en el marcador | Fila separada: Anular gol / Finalizar / W.O. |
| Marcador básico | Marcador con logo de equipo y badge EN VIVO animado |

**Flujo de acción mejorado:**
```
Click "Gol" equipo local
       ↓
Mini-modal: seleccionar jugador + minuto
       ↓
Registrar → fetchMatch() actualiza UI
```

**Orden de implementación:**
1. Marcador + status bar + tabs
2. Sección Acciones con botones directos por equipo
3. Timeline de eventos en 3 columnas
4. Quitar polling (setInterval 15s) dentro de este mismo paso

# Reporte de Desarrollo — ChampZone

> Última actualización: 2026-04-03

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Base de datos | PostgreSQL local (`sas_campeonatos`) |
| ORM | Prisma 7 con `@prisma/adapter-pg` |
| Autenticación | NextAuth v5 beta (Credentials provider, JWT) |
| UI | Tailwind CSS + shadcn/ui |
| Validación | Zod |
| Seguridad | bcryptjs (hashing de contraseñas) |

---

## Credenciales de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@champzone.com` | `admin123` | Administrador |
| `org@champzone.com` | `org123` | Organizador |

> Para resetear la BD: `npx tsx prisma/seed.ts`

---

## Roles del sistema

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| `administrador` | `/admin` completo | Gestiona toda la plataforma |
| `organizador` | `/admin` limitado | Gestiona sus campeonatos asignados |
| `supervisor` | `/admin` (pendiente) | Supervisa partidos |
| `tecnico` | `/admin` (pendiente) | Registra eventos en partidos |
| `delegado` | `/delegado` | Registra equipo y planilla |

---

## Arquitectura de autenticación

- **`auth.ts`** — Función `authorize` con Prisma + bcrypt. Incluye logs de debug temporales.
- **`auth.config.ts`** — Callbacks JWT y session. Agrega `id`, `role`, `mustChangePassword` al token.
- **`middleware.ts`** — Edge-compatible (usa solo `auth.config`, sin Prisma). Protege `/admin/*` y `/delegado/*`.
- **`app/providers.tsx`** — `SessionProvider` envuelve toda la app desde `app/layout.tsx`.
- **`types/next-auth.d.ts`** — Extiende `Session` y `JWT` con `role` y `mustChangePassword`.

### Flujo de sesión
```
authorize() → role en JWT → session callback → useSession() en componentes
```

> **Importante:** Si el sidebar aparece vacío, borrar cookies de `localhost:3000` y re-loguearse. El JWT viejo no tiene el campo `role`.

---

## Sidebar por roles (`components/AdminSidebar.tsx`)

Cada item del menú tiene un array `roles[]`. El sidebar filtra con `useSession()`:

| Item | Roles que lo ven |
|------|-----------------|
| Dashboard | admin, organizador |
| Campeonatos | admin, organizador |
| Delegados | admin, organizador |
| Roles y Usuarios | admin |
| Técnicos | admin |
| Supervisores | admin |
| Inscripción | admin |

---

## Módulo: Campeonatos

### Formatos disponibles
| Formato | Descripción |
|---------|-------------|
| `liga` | Todos contra todos |
| `eliminacion` | Eliminación directa |
| `grupos_eliminacion` | Grupos + Eliminación |
| `personalizado` | Fases libres definidas por el organizador |

### API
- `GET /api/championships` — Lista campeonatos. Soporta `?search=` y `?mine=true` (para organizador)
- `POST /api/championships` — Crea campeonato + genera cuentas delegado automáticamente si `maxEquipos > 0`
- `PATCH /api/championships/[id]` — Edita campeonato
- `DELETE /api/championships/[id]` — Elimina campeonato

### Flujo de estados
```
borrador → inscripciones → en_curso → finalizado
              ↓
           borrador (se puede volver)
```

### Generación automática de cuentas delegado
Al crear un campeonato con `maxEquipos > 0`, se generan automáticamente usuarios con:
- Email temporal: `d1@slug-campeonato`, `d2@slug-campeonato`, ...
- Contraseña temporal aleatoria (8 chars)
- `mustChangePassword: true`

---

## Módulo: Delegados (`/admin/delegados`)

Panel para admin y organizador. Selector de campeonato en la parte superior.

### Columnas de la tabla
| Columna | Descripción |
|---------|-------------|
| # | Número de cupo |
| Delegado | Email temporal (con copy) o nombre real + email si ya configuró cuenta |
| Credenciales | Contraseña temporal o "Configurada ✓" |
| Equipo | Nombre del equipo registrado o — |
| Estado | Disponible / Asignado / Activo / Inactivo |
| Acciones | Botón "Enviar WS" o número guardado |

### Botón "Enviar WS" (WhatsApp)
- Abre dialog para ingresar número con código de país (ej: `593991234567`)
- Al confirmar: guarda el número en `user.assignedTo` + abre `https://wa.me/{número}?text=...`
- Mensaje incluye: nombre del campeonato, email y contraseña temporal, URL de login
- Una vez enviado: muestra el número como registro permanente, sin botón (no se puede reenviar)

### API
- `GET /api/championships/[id]/cupos` — Lista cupos (delegados) del campeonato
- `PATCH /api/championships/[id]/cupos` — Guarda número de WhatsApp en `assignedTo`

---

## Módulo: Onboarding del Delegado

### Flujo completo
1. Delegado recibe email temporal (`d1@slug`) y contraseña por WhatsApp
2. Inicia sesión → `mustChangePassword: true` → redirige automáticamente a `/delegado/cambiar-password`
3. Completa formulario: nombre completo, correo real, teléfono (opcional), nueva contraseña
4. Al guardar: se actualiza la cuenta, `tempPassword: null`, `mustChangePassword: false`
5. Se hace `signOut` automático → delegado re-ingresa con su correo y contraseña reales

### API
- `PATCH /api/delegado/change-password` — Actualiza nombre, email, teléfono y contraseña. Valida unicidad de email.

---

## Módulo: Inscripción de Delegados

### Flujo
1. Delegado va a `/delegado/inscripcion`
2. Selecciona el campeonato al que pertenece
3. Registra su equipo (nombre)
4. Agrega jugadores por DNI:
   - **DNI encontrado en BD** → datos autocompletan (readonly)
   - **DNI no encontrado** → ingresa datos manualmente (nombre, apellido, fecha nacimiento, género)
5. Jugador queda en estado `inscrito` directamente (sin aprobación)

### API
- `GET /api/delegado/championships` — Campeonatos del delegado
- `GET/POST /api/delegado/team` — Obtener/crear equipo del delegado
- `GET/POST /api/delegado/team/[teamId]/roster` — Planilla del equipo
- `DELETE /api/delegado/team/[teamId]/roster/[entryId]` — Remover jugador
- `GET /api/players/lookup?dni=...` — Lookup de jugador por DNI

### Mi Equipo (`/delegado/equipo`)
- Muestra datos del equipo, progreso de planilla (titulares + mínimo suplentes)
- Lista de jugadores en modo lectura (delegado no puede eliminar)

---

## Módulo: Planillas (Admin/Organizador)

### Acceso
Botón `ClipboardList` en la tabla de campeonatos → `/admin/campeonatos/[id]/planillas`

### Funcionalidad
- Lista todos los equipos del campeonato con sus jugadores
- Botón "Eliminar" por jugador (con confirmación)
- Botón deshabilitado si campeonato está `en_curso` o `finalizado`

### API
- `GET /api/championships/[id]/teams` — Todos los equipos con sus planillas
- `DELETE /api/championships/[id]/teams/[teamId]/roster/[entryId]` — Eliminar jugador

---

## Módulo: Fases (Campeonato Personalizado)

### Acceso
Botón `Layers` en la tabla de campeonatos (solo formato `personalizado`) → `/admin/campeonatos/[id]/fases`

### Tipos de fase

| Tipo | Parámetros |
|------|-----------|
| `todos_contra_todos` | Modalidad: ida / ida y vuelta |
| `grupos` | N° grupos, equipos por grupo, cuántos clasifican, modalidad |
| `eliminacion` | Ronda inicial, modalidad, 3er puesto |
| `final` | Con/sin 3er puesto |

### Rondas de eliminación disponibles
| Ronda | Equipos necesarios |
|-------|------------------|
| `semifinal` | 4 → genera Semi + Final |
| `cuartos` | 8 → genera 4tos + Semi + Final |
| `octavos` | 16 → genera 8vos + 4tos + Semi + Final |
| `dieciseisavos` | 32 → genera 16avos + ... + Final |

### Reglas
- Las fases son ordenables (flechas arriba/abajo)
- Todo editable mientras el campeonato no esté `en_curso` o `finalizado`
- Cada fase puede tener partidos asociados

### API
- `GET/POST /api/championships/[id]/phases` — Lista y crea fases
- `PATCH /api/championships/[id]/phases` — Reordena (array de `{ id, order }`)
- `PATCH /api/championships/[id]/phases/[phaseId]` — Edita fase
- `DELETE /api/championships/[id]/phases/[phaseId]` — Elimina fase

---

## Módulo: Partidos por Fase

### Acceso
Botón `CalendarDays` en cada fase → `/admin/campeonatos/[id]/fases/[phaseId]/partidos`

### Funcionalidad
- Lista partidos agrupados por **etiqueta de ronda** (`roundLabel`)
- Crear partido: local vs visitante, etiqueta, fecha, hora, sede
- Editar partido (equipos, fecha, sede, etiqueta)
- Eliminar partido (si no está `en_curso` ni `finalizado`)
- Equipos seleccionables = todos los equipos inscritos en el campeonato

### Campo `roundLabel`
Etiqueta libre para agrupar partidos. Ej: "Jornada 1", "Cuartos A", "Semifinal". Partidos con la misma etiqueta aparecen juntos.

### API
- `GET/POST /api/championships/[id]/phases/[phaseId]/matches` — Lista y crea partidos
- `PATCH /api/championships/[id]/phases/[phaseId]/matches/[matchId]` — Edita partido
- `DELETE /api/championships/[id]/phases/[phaseId]/matches/[matchId]` — Elimina partido

---

## Schema de BD — Tablas principales

```
users              → autenticación y datos de usuario
user_roles         → rol asignado por campeonato
championships      → campeonatos
phases             → fases de campeonato personalizado
teams              → equipos inscritos
players            → jugadores (global, por DNI)
roster_entries     → planilla: jugador en equipo para campeonato
matches            → partidos (con phaseId para personalizados)
match_events       → eventos de partido (goles, tarjetas, etc.)
jornadas           → jornadas (campeonatos liga)
groups             → grupos (campeonatos grupos)
standings          → tabla de posiciones
suspensions        → suspensiones de jugadores
```

---

## Migraciones aplicadas

| Migración | Cambios |
|-----------|---------|
| `20260331175226_init` | Schema inicial completo |
| `20260401224314_add_cupos_fields` | `maxEquipos` en championships, campos delegado en users |
| `20260401230725_add_min_suplentes` | `minSuplentes` en championships |
| `20260403063214_add_phases` | Enum `PhaseType`, enum `EliminacionRound`, enum `personalizado`, tabla `phases`, `phaseId` en matches |
| `20260403075032_add_round_label` | Campo `roundLabel` en matches |

---

## Archivos clave

```
prisma/
  schema.prisma          → modelo de datos completo
  seed.ts                → limpia BD y crea admin + organizador demo

auth.ts                  → NextAuth con Prisma + bcrypt
auth.config.ts           → callbacks JWT/session, redirecciones por rol
middleware.ts            → protección de rutas (edge-compatible)
types/next-auth.d.ts     → extensión de tipos de sesión

components/
  AdminSidebar.tsx       → sidebar con filtro por rol
  admin/
    PlayerInscriptionForm.tsx  → formulario de inscripción con lookup DNI

app/
  admin/
    campeonatos/
      page.tsx                         → CRUD de campeonatos
      [id]/cupos/page.tsx              → gestión de cupos (legacy)
      [id]/planillas/page.tsx          → planillas por campeonato
      [id]/fases/page.tsx              → gestión de fases (personalizado)
      [id]/fases/[phaseId]/
        partidos/page.tsx              → panel de partidos por fase
    delegados/page.tsx                 → gestión de delegados con WS
    inscripcion/page.tsx               → inscripción desde admin
    roles/page.tsx                     → gestión de roles y usuarios
  delegado/
    layout.tsx                         → layout del portal delegado
    equipo/page.tsx                    → mi equipo + planilla (lectura)
    inscripcion/page.tsx               → registrar equipo y jugadores
    cambiar-password/page.tsx          → onboarding: configurar cuenta real
  login/
    page.tsx                           → página de login
    actions.ts                         → server action de login

api/
  auth/[...nextauth]/route.ts          → handler de NextAuth
  championships/
    route.ts                           → GET (con ?mine=true) / POST
    [id]/route.ts                      → PATCH / DELETE
    [id]/cupos/route.ts                → GET / PATCH (whatsapp)
    [id]/teams/route.ts                → GET equipos con planillas
    [id]/teams/[teamId]/roster/
      [entryId]/route.ts               → DELETE jugador (organizador)
    [id]/phases/
      route.ts                         → GET / POST / PATCH (reorden)
      [phaseId]/route.ts               → PATCH / DELETE fase
      [phaseId]/matches/
        route.ts                       → GET / POST partidos
        [matchId]/route.ts             → PATCH / DELETE partido
  delegado/
    championships/route.ts             → GET campeonatos del delegado
    change-password/route.ts           → PATCH onboarding
    team/route.ts                      → GET / POST equipo
    team/[teamId]/roster/route.ts      → GET / POST planilla
    team/[teamId]/roster/[entryId]/
      route.ts                         → DELETE jugador (delegado)
  players/
    lookup/route.ts                    → GET lookup por DNI
  users/
    route.ts                           → GET usuarios por rol
    [id]/route.ts                      → PATCH / DELETE usuario
```

---

## Pendiente / Próximos pasos

- [ ] Portal Supervisor — funcionalidad por definir
- [ ] Portal Técnico — registro de eventos en partido
- [ ] Auto-generación de partidos (todos contra todos, bracket eliminación)
- [ ] Resultados — panel para ingresar marcadores
- [ ] Tabla de posiciones en tiempo real
- [ ] Dashboard admin con datos reales (actualmente usa mock data)
- [ ] Páginas públicas (home, campeonatos, partidos, equipos) — aún con mock data

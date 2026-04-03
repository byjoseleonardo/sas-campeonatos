# Plan: Completar proceso de inscripción de delegados

## Resumen
Completar el flujo de inscripción directa (sin aprobación). Solo el **organizador** puede remover jugadores mientras el campeonato no haya iniciado.

---

## Tareas

### 1. Inscripción directa — cambiar status inicial
- [ ] **Archivo:** `app/api/delegado/team/[teamId]/roster/route.ts`
- Cambiar `status: "pendiente"` → `status: "inscrito"` en el POST de creación

---

### 2. API: Endpoint de lookup por DNI
- [ ] **Nuevo archivo:** `app/api/players/lookup/route.ts`
- `GET /api/players/lookup?dni=...`
- Busca en tabla `Player` por `dni`
- Retorna `{ firstName, lastName, birthDate, gender }` o `null`
- Requiere sesión autenticada

---

### 3. PlayerInscriptionForm: Usar lookup real
- [ ] **Archivo:** `components/admin/PlayerInscriptionForm.tsx`
- Reemplazar `lookupDni()` de `lib/dniDatabase.ts` por fetch a `/api/players/lookup?dni=...`
- Si **no se encuentra**: campos manuales habilitados (firstName, lastName, birthDate, gender)
- Si **se encuentra**: campos personales en readonly, solo editar número y posición

---

### 4. Mi Equipo: Agregar lista de jugadores
- [ ] **Archivo:** `app/delegado/equipo/page.tsx`
- Agregar fetch a `GET /api/delegado/team/[teamId]/roster`
- Mostrar tabla: #, Nombre, Cédula, Posición, Estado
- Solo lectura (delegado no puede eliminar)

---

### 5. API: Organizador elimina jugador de planilla
- [ ] **Nuevo archivo:** `app/api/championships/[id]/teams/[teamId]/roster/[entryId]/route.ts`
- `DELETE /api/championships/[id]/teams/[teamId]/roster/[entryId]`
- Valida: usuario es admin u organizador del campeonato
- Valida: `championship.status` no es `"en_curso"` ni `"finalizado"`
- Elimina el `RosterEntry`

---

### 6. Página admin: Gestión de planillas por campeonato
- [ ] **Nuevo archivo:** `app/admin/campeonatos/[id]/planillas/page.tsx`
- Lista todos los equipos del campeonato
- Por equipo: tabla con #, Nombre, Cédula, Posición, Estado, Acciones
- Botón "Eliminar" por jugador (deshabilitado si campeonato está en `en_curso`/`finalizado`)
- Llama al endpoint del punto 5
- [ ] **Archivo:** `app/admin/campeonatos/page.tsx`
- Agregar botón "Planillas" en cada fila de campeonato (junto al de "Cupos")

---

## Archivos involucrados

| Archivo | Tipo |
|---------|------|
| `app/api/delegado/team/[teamId]/roster/route.ts` | Modificar |
| `app/delegado/equipo/page.tsx` | Modificar |
| `components/admin/PlayerInscriptionForm.tsx` | Modificar |
| `app/api/players/lookup/route.ts` | Nuevo |
| `app/api/championships/[id]/teams/[teamId]/roster/[entryId]/route.ts` | Nuevo |
| `app/admin/campeonatos/[id]/planillas/page.tsx` | Nuevo |
| `app/admin/campeonatos/page.tsx` | Modificar |

---

## Reglas de negocio clave
- Inscripción es **directa** — sin paso de aprobación
- Solo el **organizador** (o admin) puede eliminar jugadores de una planilla
- La eliminación solo es posible mientras `championship.status` sea `borrador` o `inscripciones`
- El delegado puede ver su planilla pero **no puede eliminar jugadores**

---

## Verificación

1. Delegado hace login → cambia contraseña si `mustChangePassword = true`
2. Va a Inscripción → selecciona campeonato en `inscripciones`
3. Registra equipo → agrega jugador por DNI:
   - Si existe en BD: datos se autocompetan (readonly)
   - Si no existe: llena datos manualmente
   - Al guardar: jugador aparece como `inscrito` directamente
4. Mi Equipo muestra la lista de jugadores (solo lectura)
5. Organizador en `/admin/campeonatos/[id]/planillas` ve todos los equipos
6. Organizador elimina jugador → solo posible si campeonato no ha iniciado
7. Si campeonato pasa a `en_curso`, el botón eliminar queda deshabilitado

---

## Estado
- [x] Tarea 1 — Inscripción directa
- [x] Tarea 2 — API DNI lookup
- [x] Tarea 3 — PlayerInscriptionForm real
- [x] Tarea 4 — Mi Equipo con roster
- [x] Tarea 5 — API organizador elimina jugador
- [x] Tarea 6 — Página planillas admin

# Plan de Refactorización — Jerarquía de Roles SAS Campeonatos

## Jerarquía Final

```
SUPERADMIN  → /superadmin
 └── Crea y gestiona ADMINS (clientes del negocio)

ADMIN  → /admin  (aislado, ve solo su data)
 └── Crea ORGANIZADORES
 └── Ve campeonatos de sus organizadores (solo lectura)

ORGANIZADOR  → /admin (mismo portal, distinto poder)
 └── Crea CAMPEONATOS (gestión completa)
 └── Crea TÉCNICOS DE MESA
 └── Delegados se crean automáticamente al crear campeonato ✓

TÉCNICO DE MESA  → /tecnico
DELEGADO         → /delegado
```

---

## Fases

### Fase 1 — Base de Datos
**Estado: ✅ Completada**

- [x] Agregar `superadministrador` al enum `Role` en `prisma/schema.prisma`
- [x] Renombrar `tecnico` → `tecnico_mesa` en el enum `Role`
- [x] Agregar campo `adminId` al modelo `User` (asocia organizadores a su admin dueño)
- [x] Agregar campo `adminId` al modelo `Championship` (aísla campeonatos por admin)
- [x] Correr `prisma db push --force-reset`
- [x] Seed actualizado con superadmin, admin y organizador

**Archivos:**
- `prisma/schema.prisma`
- `prisma/seed.ts` (si existe)

---

### Fase 2 — Portal Superadmin
**Estado: ✅ Completada**

- [x] Crear ruta y layout `/app/superadmin/layout.tsx`
- [x] Crear sidebar propio para superadmin (`components/SuperAdminSidebar.tsx`)
- [x] Página: dashboard con stats (`/superadmin`)
- [x] Página: listar/crear/editar/desactivar/eliminar admins (`/superadmin/admins`)
- [x] Actualizar `auth.config.ts`: redirigir `superadministrador` → `/superadmin`
- [x] Actualizar `middleware.ts`: proteger `/superadmin/:path*`
- [x] Crear API `/api/superadmin/admins` (GET, POST)
- [x] Crear API `/api/superadmin/admins/[id]` (PATCH, DELETE)
- [x] Corregir todas las referencias `Role.tecnico` → `Role.tecnico_mesa` en APIs existentes

**Archivos:**
- `app/superadmin/` (nuevo)
- `auth.config.ts`
- `middleware.ts`
- `app/api/superadmin/` (nuevo)

---

### Fase 3 — Ajustar Portal Admin
**Estado: ✅ Completada**

- [ ] Admin solo puede crear organizadores (quitar creación de técnicos y campeonatos)
- [ ] Campeonatos en admin: solo lectura, sin botones de acción (crear/editar/eliminar)
- [ ] Todas las queries filtradas por `adminId` del usuario en sesión
- [ ] Actualizar sidebar admin: Dashboard | Organizadores | Campeonatos (read-only)
- [ ] API usuarios: admin solo puede crear rol `organizador`
- [ ] API campeonatos GET: filtrar por `adminId`

**Archivos:**
- `app/admin/campeonatos/page.tsx`
- `app/admin/roles/page.tsx`
- `app/api/championships/route.ts`
- `app/api/users/route.ts`
- `components/AdminSidebar.tsx`

---

### Fase 4 — Portal Organizador
**Estado: ✅ Completada**

- [ ] Organizador puede crear/editar/eliminar sus propios campeonatos
- [ ] Organizador puede crear técnicos de mesa (scoped a sus campeonatos)
- [ ] Queries de campeonatos filtradas por organizador en sesión
- [ ] Actualizar sidebar organizador: Dashboard | Campeonatos | Técnicos de Mesa | Delegados
- [ ] API campeonatos POST: permitir rol `organizador`, auto-asignar `adminId` del organizador
- [ ] API usuarios POST: organizador puede crear `tecnico_mesa`

**Archivos:**
- `app/admin/campeonatos/page.tsx`
- `app/admin/roles/page.tsx`
- `app/api/championships/route.ts`
- `app/api/users/route.ts`
- `components/AdminSidebar.tsx`

---

### Fase 5 — Renombrar Técnico → Técnico de Mesa
**Estado: ✅ Completada**

- [x] `app/tecnico/layout.tsx` — "Portal Técnico" → "Portal Técnico de Mesa"
- [x] `app/admin/page.tsx` — stat card "Técnicos" → "Técnicos de Mesa"
- [x] `lib/adminMockData.ts` — tipo, labels, badges y datos mock actualizados
- [x] `components/AdminSidebar.tsx` — ya actualizado en Fase 2
- [x] `app/admin/roles/page.tsx` — ya actualizado en Fase 3
- [x] `app/admin/layout.tsx` — ya actualizado en Fase 2

**Archivos:**
- `app/admin/roles/page.tsx`
- `app/admin/campeonatos/page.tsx`
- `components/AdminSidebar.tsx`
- Cualquier otro componente con el label "Técnico"

---

## Resumen de Archivos Afectados

| Archivo | Fases |
|---------|-------|
| `prisma/schema.prisma` | 1 |
| `auth.config.ts` | 2 |
| `middleware.ts` | 2 |
| `app/superadmin/` *(nuevo)* | 2 |
| `app/api/superadmin/` *(nuevo)* | 2 |
| `app/admin/campeonatos/page.tsx` | 3, 4, 5 |
| `app/admin/roles/page.tsx` | 3, 4, 5 |
| `app/api/championships/route.ts` | 3, 4 |
| `app/api/users/route.ts` | 3, 4 |
| `components/AdminSidebar.tsx` | 3, 4, 5 |

---

## Notas Importantes

- **Aislamiento**: cada admin ve únicamente sus organizadores y campeonatos. El campo `adminId` en `User` y `Championship` es la clave de este aislamiento.
- **Delegados**: se crean automáticamente al crear un campeonato (flujo actual). El organizador los gestiona indirectamente.
- **Seed de prueba**: hay datos de prueba en la BD. Al correr la migración de Fase 1 pueden requerirse ajustes en el seed.
- **El portal `/admin` es compartido** entre admin y organizador — el poder de cada uno se controla por rol en sesión.

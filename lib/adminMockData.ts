export interface SportConfig {
  id: string;
  name: string;
  icon: string;
  defaultTitulares: number;
  defaultSuplentes: number;
  defaultMatchDuration: number; // minutes
}

export const sportConfigs: SportConfig[] = [
  { id: "futbol", name: "Fútbol", icon: "⚽", defaultTitulares: 11, defaultSuplentes: 7, defaultMatchDuration: 90 },
  { id: "voleibol", name: "Voleibol", icon: "🏐", defaultTitulares: 6, defaultSuplentes: 6, defaultMatchDuration: 60 },
  { id: "futsal", name: "Futsal", icon: "⚽", defaultTitulares: 5, defaultSuplentes: 7, defaultMatchDuration: 40 },
  { id: "baloncesto", name: "Baloncesto", icon: "🏀", defaultTitulares: 5, defaultSuplentes: 7, defaultMatchDuration: 48 },
];

export interface ChampionshipConfig {
  id: string;
  name: string;
  sportId: string;
  format: string;
  minJugadores: number;
  maxInscripciones: number;
  matchDuration: number;
  location: string;
  date: string;
  status: "activo" | "inscripciones" | "finalizado";
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "organizador" | "supervisor" | "tecnico_mesa" | "delegado";
  championshipId?: string;
  championshipName?: string;
  teamId?: string;
  teamName?: string;
  status: "activo" | "inactivo";
  createdAt: string;
}

export const adminUsers: AdminUser[] = [
  { id: "u1", name: "Carlos Méndez", email: "carlos@champzone.com", role: "organizador", status: "activo", createdAt: "01 Ene 2026" },
  { id: "u2", name: "María López", email: "maria@champzone.com", role: "supervisor", championshipId: "1", championshipName: "Copa Primavera 2026", status: "activo", createdAt: "05 Feb 2026" },
  { id: "u3", name: "Pedro Ruiz", email: "pedro@champzone.com", role: "tecnico_mesa", championshipId: "4", championshipName: "Copa Nocturna", status: "activo", createdAt: "10 Feb 2026" },
  { id: "u4", name: "Ana García", email: "ana@champzone.com", role: "delegado", championshipId: "1", championshipName: "Copa Primavera 2026", teamId: "1", teamName: "Águilas FC", status: "activo", createdAt: "12 Feb 2026" },
  { id: "u5", name: "Luis Torres", email: "luis@champzone.com", role: "delegado", championshipId: "1", championshipName: "Copa Primavera 2026", teamId: "2", teamName: "Leones SC", status: "activo", createdAt: "12 Feb 2026" },
  { id: "u6", name: "Sofía Herrera", email: "sofia@champzone.com", role: "delegado", championshipId: "2", championshipName: "Liga Interbarrial", teamId: "3", teamName: "Tigres United", status: "inactivo", createdAt: "15 Feb 2026" },
  { id: "u7", name: "Juan Paredes", email: "juan@champzone.com", role: "organizador", status: "activo", createdAt: "01 Ene 2026" },
  { id: "u8", name: "Rosa Delgado", email: "rosa@champzone.com", role: "tecnico_mesa", championshipId: "2", championshipName: "Liga Interbarrial", status: "inactivo", createdAt: "20 Feb 2026" },
  { id: "u9", name: "Diego Salazar", email: "diego@champzone.com", role: "supervisor", championshipId: "4", championshipName: "Copa Nocturna", status: "activo", createdAt: "08 Feb 2026" },
];

export const roleLabels: Record<AdminUser["role"], string> = {
  organizador: "Organizador",
  supervisor: "Supervisor",
  tecnico_mesa: "Técnico de Mesa",
  delegado: "Delegado",
};

export const roleBadgeVariants: Record<AdminUser["role"], string> = {
  organizador: "bg-primary/15 text-primary border-primary/30",
  supervisor: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  tecnico_mesa: "bg-accent/15 text-accent-foreground border-accent/30",
  delegado: "bg-secondary/80 text-secondary-foreground border-secondary",
};

export interface Player {
  id: string;
  name: string;
  cedula: string;
  position: string;
  number: number;
  teamId: string;
  teamName: string;
  championshipId: string;
  photoUrl?: string;
  status: "inscrito" | "pendiente" | "rechazado";
  createdAt: string;
}

export const mockPlayers: Player[] = [
  { id: "p1", name: "Roberto Sánchez", cedula: "0901234567", position: "Portero", number: 1, teamId: "1", teamName: "Águilas FC", championshipId: "1", photoUrl: "", status: "inscrito", createdAt: "15 Feb 2026" },
  { id: "p2", name: "Miguel Ángel Torres", cedula: "0912345678", position: "Defensa", number: 4, teamId: "1", teamName: "Águilas FC", championshipId: "1", photoUrl: "", status: "inscrito", createdAt: "15 Feb 2026" },
  { id: "p3", name: "Fernando Castillo", cedula: "0923456789", position: "Mediocampista", number: 8, teamId: "1", teamName: "Águilas FC", championshipId: "1", photoUrl: "", status: "inscrito", createdAt: "16 Feb 2026" },
  { id: "p4", name: "Andrés Morales", cedula: "0934567890", position: "Delantero", number: 9, teamId: "1", teamName: "Águilas FC", championshipId: "1", photoUrl: "", status: "pendiente", createdAt: "17 Feb 2026" },
  { id: "p5", name: "Carlos Vega", cedula: "0945678901", position: "Defensa", number: 2, teamId: "1", teamName: "Águilas FC", championshipId: "1", photoUrl: "", status: "inscrito", createdAt: "15 Feb 2026" },
  { id: "p6", name: "David Ramos", cedula: "0956789012", position: "Mediocampista", number: 10, teamId: "2", teamName: "Leones SC", championshipId: "1", photoUrl: "", status: "inscrito", createdAt: "16 Feb 2026" },
  { id: "p7", name: "Jorge Mendoza", cedula: "0967890123", position: "Portero", number: 1, teamId: "2", teamName: "Leones SC", championshipId: "1", photoUrl: "", status: "inscrito", createdAt: "16 Feb 2026" },
  { id: "p8", name: "Esteban Flores", cedula: "0978901234", position: "Delantero", number: 11, teamId: "2", teamName: "Leones SC", championshipId: "1", photoUrl: "", status: "pendiente", createdAt: "18 Feb 2026" },
];

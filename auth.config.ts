import type { NextAuthConfig } from "next-auth";
import { Role } from "@/lib/generated/prisma/enums";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      if (!isLoggedIn) return false;

      const role = auth?.user?.role as Role | undefined;
      const mustChangePassword = auth?.user?.mustChangePassword as boolean | undefined;

      // Forzar cambio de contraseña antes de acceder a cualquier otra ruta
      if (mustChangePassword && pathname !== "/delegado/cambiar-password") {
        return Response.redirect(new URL("/delegado/cambiar-password", nextUrl));
      }

      // Superadmin va a su propio portal
      if (pathname.startsWith("/admin") && role === Role.superadministrador) {
        return Response.redirect(new URL("/superadmin", nextUrl));
      }
      if (pathname.startsWith("/superadmin") && role !== Role.superadministrador) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      // Técnico de mesa va a su portal, no al admin
      if (pathname.startsWith("/admin") && role === Role.tecnico_mesa) {
        return Response.redirect(new URL("/tecnico/partidos", nextUrl));
      }
      if (pathname.startsWith("/tecnico") && role !== Role.tecnico_mesa) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      // Delegado no puede acceder al panel admin
      if (pathname.startsWith("/admin") && role === Role.delegado) {
        return Response.redirect(new URL("/delegado/inscripcion", nextUrl));
      }

      // No-delegado no puede acceder al portal delegado
      if (pathname.startsWith("/delegado") && role !== Role.delegado) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.mustChangePassword = token.mustChangePassword as boolean;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          console.log("[auth] Faltan credenciales");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { userRoles: true },
          });

          if (!user) {
            console.log("[auth] Usuario no encontrado:", credentials.email);
            return null;
          }
          if (!user.isActive) {
            console.log("[auth] Usuario inactivo:", credentials.email);
            return null;
          }

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          if (!valid) {
            console.log("[auth] Contraseña incorrecta para:", credentials.email);
            return null;
          }

          const primaryRole = user.userRoles[0]?.role ?? "administrador";
          console.log("[auth] Login exitoso:", credentials.email, "| rol:", primaryRole);

          const fullName = [user.firstName, user.paternalLastName, user.maternalLastName].filter(Boolean).join(" ");

          return {
            id: user.id,
            name: fullName,
            email: user.email,
            role: primaryRole,
            mustChangePassword: user.mustChangePassword,
          };
        } catch (err) {
          console.error("[auth] Error en authorize:", err);
          return null;
        }
      },
    }),
  ],
});

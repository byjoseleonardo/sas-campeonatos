"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin", // Next.js maneja el redirect desde el servidor
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Credenciales inválidas. Verifica tu correo y contraseña." };
    }
    // Re-throw para que Next.js procese el redirect interno
    throw error;
  }
}

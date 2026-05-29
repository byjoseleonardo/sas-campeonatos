import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Antes "middleware.ts" — renombrado a "proxy.ts" (convención de Next.js 16).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/superadmin/:path*", "/admin/:path*", "/delegado/:path*", "/tecnico/:path*"],
};

import { cookies } from "next/headers";
import { prisma } from "./db";

// Dev-mode auth stub. Picks the current user from a cookie set by
// the user-switcher in the top bar. Later this gets replaced with
// Microsoft Entra ID via NextAuth or MSAL; the rest of the app just
// keeps calling getCurrentUser().

export const DEV_USER_COOKIE = "sls_dev_user";

export type Role = "engineer" | "operator" | "admin";

export async function getCurrentUser() {
  const cookieStore = cookies();
  const id = cookieStore.get(DEV_USER_COOKIE)?.value;
  if (id) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (u) return u;
  }
  // Fallback: first admin in DB, or first user at all.
  const fallback =
    (await prisma.user.findFirst({ where: { role: "admin" } })) ??
    (await prisma.user.findFirst());
  return fallback;
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("No user context. Seed the database first.");
  return u;
}

export function canOperate(role: string): boolean {
  return role === "operator" || role === "admin";
}

export function canAdmin(role: string): boolean {
  return role === "admin";
}

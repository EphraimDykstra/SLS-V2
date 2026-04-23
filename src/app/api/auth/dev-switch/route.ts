import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEV_USER_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return NextResponse.json({ error: "not found" }, { status: 404 });
  cookies().set(DEV_USER_COOKIE, u.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}

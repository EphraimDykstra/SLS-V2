import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { requireUser, canOperate } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireUser();
  if (!canOperate(me.role) && me.role !== "engineer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const f = await prisma.storedFile.findUnique({ where: { id: params.id } });
  if (!f) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Engineers can only delete files they uploaded; operators/admins can delete any.
  if (me.role === "engineer" && f.uploadedById !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    await getStorage().delete(f.storageKey);
  } catch (e) {
    // Log but still remove DB row so users can recover from stale entries.
    console.warn("Storage delete failed", e);
  }
  await prisma.storedFile.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

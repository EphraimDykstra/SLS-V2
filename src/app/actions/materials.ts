"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canOperate } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

export async function createMaterial(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const sku = String(formData.get("sku") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!name || !type) throw new Error("name and type required");
  const m = await prisma.material.create({ data: { name, type, sku, notes } });
  revalidatePath("/materials");
  redirect(`/materials/${m.id}`);
}

export async function deleteMaterial(formData: FormData) {
  const me = await requireUser();
  if (!canOperate(me.role)) throw new Error("Only operators can delete materials");
  const id = String(formData.get("id") || "");
  await prisma.material.delete({ where: { id } });
  revalidatePath("/materials");
  redirect("/materials");
}

export async function addAgingLog(formData: FormData) {
  const me = await requireUser();
  const materialId = String(formData.get("materialId") || "");
  const hoursUsed = Number(formData.get("hoursUsed") || 0) || null;
  const refreshRatio = Number(formData.get("refreshRatio") || 0) || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!materialId) throw new Error("materialId required");

  const file = formData.get("file") as File | null;
  let fileId: string | undefined;
  if (file && typeof file !== "string" && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const { storageKey, sizeBytes } = await getStorage().put({
      path: `materials/${materialId}`,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      body: buf,
    });
    const created = await prisma.storedFile.create({
      data: {
        kind: "aging_log",
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes,
        storageKey,
        uploadedById: me.id,
      },
    });
    fileId = created.id;
  }

  await prisma.materialAgingLog.create({
    data: {
      materialId,
      hoursUsed: hoursUsed ?? undefined,
      refreshRatio: refreshRatio ?? undefined,
      notes,
      recordedById: me.id,
      fileId,
    },
  });
  revalidatePath(`/materials/${materialId}`);
}

export async function deleteAgingLog(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  const log = await prisma.materialAgingLog.findUnique({ where: { id } });
  if (!log) return;
  if (log.fileId) {
    const f = await prisma.storedFile.findUnique({ where: { id: log.fileId } });
    if (f) {
      try {
        await getStorage().delete(f.storageKey);
      } catch (e) {
        console.warn("storage delete failed", e);
      }
      await prisma.storedFile.delete({ where: { id: f.id } });
    }
  }
  await prisma.materialAgingLog.delete({ where: { id } });
  revalidatePath(`/materials/${log.materialId}`);
}

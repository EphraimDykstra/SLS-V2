"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canOperate } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import {
  DEFAULT_POSTPROCESS_STEPS,
  FILE_KINDS,
  FileKind,
  JOB_STATUSES,
  JobStatus,
} from "@/lib/domain";

export async function createJob(formData: FormData) {
  const me = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const materialId = (String(formData.get("materialId") || "") || null) as string | null;
  const priority = Number(formData.get("priority") || 3);
  const quantity = Number(formData.get("quantity") || 1);
  const notes = String(formData.get("notes") || "").trim() || null;
  const templateName = String(formData.get("postProcessTemplate") || "").trim();

  if (!name) throw new Error("Name is required");

  const stepNames = await resolveSteps(templateName);

  const job = await prisma.printJob.create({
    data: {
      name,
      description,
      materialId: materialId || undefined,
      priority,
      quantity,
      notes,
      createdById: me.id,
      queuedAt: new Date(),
      postProcessSteps: {
        create: stepNames.map((n, i) => ({ name: n, order: i })),
      },
    },
  });

  // Optional: attach any initial files uploaded on the create form
  const files = formData.getAll("files") as File[];
  for (const file of files) {
    if (!file || typeof file === "string" || file.size === 0) continue;
    await uploadFileToJob(job.id, file, inferKind(file.name));
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

async function resolveSteps(templateName: string): Promise<string[]> {
  if (!templateName || templateName === "__default__") return DEFAULT_POSTPROCESS_STEPS;
  const tmpl = await prisma.postProcessTemplate.findUnique({
    where: { name: templateName },
  });
  if (!tmpl) return DEFAULT_POSTPROCESS_STEPS;
  try {
    const parsed = JSON.parse(tmpl.stepsJson);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed;
    }
  } catch {}
  return DEFAULT_POSTPROCESS_STEPS;
}

function inferKind(filename: string): FileKind {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (ext === "stl") return "design_stl";
  if (ext === "3mf") return "design_3mf";
  if (ext === "form") return "preform_form";
  if (["png", "jpg", "jpeg", "webp", "heic"].includes(ext)) return "photo_raw";
  if (["pdf", "docx", "txt", "md"].includes(ext)) return "postprocess_doc";
  return "other";
}

export async function uploadFileToJob(
  jobId: string,
  file: File,
  kind: FileKind
) {
  const me = await requireUser();
  const buf = Buffer.from(await file.arrayBuffer());
  const { storageKey, sizeBytes } = await getStorage().put({
    path: `jobs/${jobId}`,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    body: buf,
  });
  await prisma.storedFile.create({
    data: {
      kind,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes,
      storageKey,
      jobId,
      uploadedById: me.id,
    },
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function uploadFilesAction(formData: FormData) {
  const jobId = String(formData.get("jobId") || "");
  const kindRaw = String(formData.get("kind") || "other");
  const kind = (FILE_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as FileKind)
    : "other";
  if (!jobId) throw new Error("jobId required");
  const files = formData.getAll("files") as File[];
  for (const f of files) {
    if (!f || typeof f === "string" || f.size === 0) continue;
    await uploadFileToJob(jobId, f, kind);
  }
}

export async function setJobStatus(formData: FormData) {
  const me = await requireUser();
  if (!canOperate(me.role)) throw new Error("Only operators can change status");
  const jobId = String(formData.get("jobId") || "");
  const status = String(formData.get("status") || "") as JobStatus;
  if (!(JOB_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid status");
  }
  const data: Record<string, unknown> = { status };
  if (status === "printed") data.printedAt = new Date();
  if (status === "archived") data.archivedAt = new Date();
  await prisma.printJob.update({ where: { id: jobId }, data });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/archive");
}

export async function toggleStep(formData: FormData) {
  const me = await requireUser();
  const stepId = String(formData.get("stepId") || "");
  const step = await prisma.postProcessStep.findUnique({ where: { id: stepId } });
  if (!step) throw new Error("step not found");
  if (step.completedAt) {
    await prisma.postProcessStep.update({
      where: { id: stepId },
      data: { completedAt: null, completedById: null },
    });
  } else {
    await prisma.postProcessStep.update({
      where: { id: stepId },
      data: { completedAt: new Date(), completedById: me.id },
    });
  }
  revalidatePath(`/jobs/${step.jobId}`);
}

export async function addPostProcessStep(formData: FormData) {
  await requireUser();
  const jobId = String(formData.get("jobId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!jobId || !name) return;
  const last = await prisma.postProcessStep.findFirst({
    where: { jobId },
    orderBy: { order: "desc" },
  });
  await prisma.postProcessStep.create({
    data: { jobId, name, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteStep(formData: FormData) {
  await requireUser();
  const stepId = String(formData.get("stepId") || "");
  const step = await prisma.postProcessStep.findUnique({ where: { id: stepId } });
  if (!step) return;
  await prisma.postProcessStep.delete({ where: { id: stepId } });
  revalidatePath(`/jobs/${step.jobId}`);
}

export async function deleteJob(formData: FormData) {
  const me = await requireUser();
  if (!canOperate(me.role)) throw new Error("Only operators can delete jobs");
  const jobId = String(formData.get("jobId") || "");
  const files = await prisma.storedFile.findMany({ where: { jobId } });
  for (const f of files) {
    try {
      await getStorage().delete(f.storageKey);
    } catch (e) {
      console.warn("storage delete failed", f.id, e);
    }
  }
  await prisma.printJob.delete({ where: { id: jobId } });
  revalidatePath("/jobs");
  revalidatePath("/archive");
  redirect("/jobs");
}

export async function addFailureReport(formData: FormData) {
  const me = await requireUser();
  const jobId = String(formData.get("jobId") || "");
  const summary = String(formData.get("summary") || "").trim();
  const category = String(formData.get("category") || "other");
  const details = String(formData.get("details") || "").trim() || null;
  if (!jobId || !summary) throw new Error("summary required");
  await prisma.failureReport.create({
    data: { jobId, summary, category, details, reportedById: me.id },
  });
  await prisma.printJob.update({
    where: { id: jobId },
    data: { status: "failed" },
  });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/failures");
  revalidatePath("/jobs");
}

export async function deleteFailureReport(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") || "");
  const rep = await prisma.failureReport.findUnique({ where: { id } });
  if (!rep) return;
  await prisma.failureReport.delete({ where: { id } });
  revalidatePath(`/jobs/${rep.jobId}`);
  revalidatePath("/failures");
}

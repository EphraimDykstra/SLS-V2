import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const STORAGE_ROOT = path.resolve(process.env.MOCK_STORAGE_DIR || "./storage");

async function putPlaceholder(
  logicalPath: string,
  filename: string,
  body: string | Buffer
): Promise<{ storageKey: string; sizeBytes: number }> {
  const id = crypto.randomUUID();
  const rel = path.posix.join(logicalPath, id + "__" + filename);
  const abs = path.resolve(STORAGE_ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const buf = typeof body === "string" ? Buffer.from(body) : body;
  await fs.writeFile(abs, buf);
  return { storageKey: rel, sizeBytes: buf.length };
}

async function main() {
  // Reset (order matters for FKs)
  await prisma.failureReport.deleteMany();
  await prisma.postProcessStep.deleteMany();
  await prisma.materialAgingLog.deleteMany();
  await prisma.storedFile.deleteMany();
  await prisma.printJob.deleteMany();
  await prisma.postProcessTemplate.deleteMany();
  await prisma.material.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { name: "Pat Admin", email: "admin@example.com", role: "admin" },
  });
  const op = await prisma.user.create({
    data: { name: "Sam Operator", email: "sam@example.com", role: "operator" },
  });
  const eng1 = await prisma.user.create({
    data: { name: "Alex Engineer", email: "alex@example.com", role: "engineer" },
  });
  const eng2 = await prisma.user.create({
    data: { name: "Jordan Engineer", email: "jordan@example.com", role: "engineer" },
  });

  await prisma.postProcessTemplate.createMany({
    data: [
      {
        name: "Standard SLS",
        stepsJson: JSON.stringify([
          "Depowder",
          "Bead blast",
          "Tumble",
          "Inspect",
          "Pack",
        ]),
      },
      {
        name: "Dyed black",
        stepsJson: JSON.stringify([
          "Depowder",
          "Bead blast",
          "Dye black",
          "Rinse",
          "Dry",
          "Inspect",
          "Pack",
        ]),
      },
      {
        name: "Functional / high-detail",
        stepsJson: JSON.stringify([
          "Depowder",
          "Bead blast",
          "Manual finishing",
          "Vapor smooth",
          "Dimensional check",
          "Pack",
        ]),
      },
    ],
  });

  const mat1 = await prisma.material.create({
    data: { name: "Nylon 12 PA — Batch A", type: "Nylon 12 (PA)", sku: "N12-A-001" },
  });
  const mat2 = await prisma.material.create({
    data: { name: "Nylon 11 — Batch B", type: "Nylon 11", sku: "N11-B-002" },
  });
  const mat3 = await prisma.material.create({
    data: { name: "TPU 88A", type: "TPU", sku: "TPU-88A" },
  });

  // Aging logs on mat1
  const agingFile = await putPlaceholder(
    `materials/${mat1.id}`,
    "aging_test_report.txt",
    "Placeholder aging test report. Replace with real data."
  );
  const agingFileDb = await prisma.storedFile.create({
    data: {
      kind: "aging_log",
      name: "aging_test_report.txt",
      mimeType: "text/plain",
      sizeBytes: agingFile.sizeBytes,
      storageKey: agingFile.storageKey,
      uploadedById: op.id,
    },
  });
  await prisma.materialAgingLog.create({
    data: {
      materialId: mat1.id,
      hoursUsed: 42,
      refreshRatio: 0.3,
      notes: "First refresh this batch. Tensile test passed.",
      recordedById: op.id,
      fileId: agingFileDb.id,
    },
  });
  await prisma.materialAgingLog.create({
    data: {
      materialId: mat1.id,
      hoursUsed: 78,
      refreshRatio: 0.4,
      notes: "Color drift starting to show on thin walls.",
      recordedById: op.id,
    },
  });

  // Jobs
  const jobA = await prisma.printJob.create({
    data: {
      name: "GearHousing-rev3",
      description: "Gen-4 gear housing, 8 units",
      createdById: eng1.id,
      materialId: mat1.id,
      priority: 2,
      quantity: 8,
      status: "queued",
      queuedAt: new Date(),
      notes: "Engineer requested vapor smooth on visible faces.",
      postProcessSteps: {
        create: [
          { name: "Depowder", order: 0 },
          { name: "Bead blast", order: 1 },
          { name: "Vapor smooth", order: 2 },
          { name: "Inspect", order: 3 },
          { name: "Pack", order: 4 },
        ],
      },
    },
  });
  const stl1 = await putPlaceholder(
    `jobs/${jobA.id}`,
    "GearHousing_rev3.stl",
    "PLACEHOLDER STL — replace me"
  );
  await prisma.storedFile.create({
    data: {
      kind: "design_stl",
      name: "GearHousing_rev3.stl",
      mimeType: "model/stl",
      sizeBytes: stl1.sizeBytes,
      storageKey: stl1.storageKey,
      jobId: jobA.id,
      uploadedById: eng1.id,
    },
  });

  const jobB = await prisma.printJob.create({
    data: {
      name: "Bracket-Qty50",
      description: "Mounting bracket run",
      createdById: eng2.id,
      materialId: mat2.id,
      priority: 3,
      quantity: 50,
      status: "printing",
      queuedAt: new Date(Date.now() - 3600_000 * 24),
      postProcessSteps: {
        create: [
          { name: "Depowder", order: 0 },
          { name: "Bead blast", order: 1 },
          { name: "Tumble", order: 2 },
          { name: "Inspect", order: 3 },
          { name: "Pack", order: 4 },
        ],
      },
    },
  });
  const formB = await putPlaceholder(
    `jobs/${jobB.id}`,
    "Bracket_Qty50.form",
    "PLACEHOLDER PREFORM FILE"
  );
  await prisma.storedFile.create({
    data: {
      kind: "preform_form",
      name: "Bracket_Qty50.form",
      mimeType: "application/octet-stream",
      sizeBytes: formB.sizeBytes,
      storageKey: formB.storageKey,
      jobId: jobB.id,
      uploadedById: op.id,
    },
  });

  const jobC = await prisma.printJob.create({
    data: {
      name: "Prototype-Clip-v2",
      description: "TPU clip prototype",
      createdById: eng1.id,
      materialId: mat3.id,
      priority: 4,
      quantity: 4,
      status: "archived",
      queuedAt: new Date(Date.now() - 3600_000 * 24 * 7),
      printedAt: new Date(Date.now() - 3600_000 * 24 * 6),
      archivedAt: new Date(Date.now() - 3600_000 * 24 * 5),
      postProcessSteps: {
        create: [
          { name: "Depowder", order: 0, completedAt: new Date(), completedById: op.id },
          { name: "Inspect", order: 1, completedAt: new Date(), completedById: op.id },
          { name: "Pack", order: 2, completedAt: new Date(), completedById: op.id },
        ],
      },
    },
  });
  const photoC = await putPlaceholder(
    `jobs/${jobC.id}`,
    "finished.txt",
    "Placeholder 'photo' of finished part."
  );
  await prisma.storedFile.create({
    data: {
      kind: "photo_processed",
      name: "finished.txt",
      mimeType: "text/plain",
      sizeBytes: photoC.sizeBytes,
      storageKey: photoC.storageKey,
      jobId: jobC.id,
      uploadedById: op.id,
    },
  });

  // A failed job with a report
  const jobD = await prisma.printJob.create({
    data: {
      name: "Manifold-test",
      description: "First attempt at fluid manifold",
      createdById: eng2.id,
      materialId: mat1.id,
      priority: 3,
      quantity: 1,
      status: "failed",
      queuedAt: new Date(Date.now() - 3600_000 * 48),
      postProcessSteps: {
        create: [{ name: "Depowder", order: 0 }],
      },
    },
  });
  await prisma.failureReport.create({
    data: {
      jobId: jobD.id,
      summary: "Laser hot-spot on layer ~280, part warped",
      category: "machine",
      details:
        "Noticed inconsistent sinter on the back-left corner. Calibration ran previously. Recommend checking galvo alignment before re-running.",
      reportedById: op.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seeded:", { admin: admin.email, jobs: [jobA.id, jobB.id, jobC.id, jobD.id] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

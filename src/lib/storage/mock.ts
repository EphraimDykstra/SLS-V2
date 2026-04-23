import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { StorageBackend, PutInput, PutResult, GetResult } from "./types";

// Local-filesystem mock. Files live under MOCK_STORAGE_DIR, organized
// by the logical `path` passed in. storageKey is the relative path
// from the root so it stays portable across dev machines.

const ROOT = path.resolve(process.env.MOCK_STORAGE_DIR || "./storage");

function safeJoin(root: string, rel: string): string {
  const joined = path.resolve(root, rel);
  if (!joined.startsWith(root + path.sep) && joined !== root) {
    throw new Error("Path traversal blocked");
  }
  return joined;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export const mockStorage: StorageBackend = {
  name: "mock",

  async put({ path: logicalPath, filename, body }: PutInput): Promise<PutResult> {
    const id = crypto.randomUUID();
    const rel = path.posix.join(logicalPath, id + "__" + sanitize(filename));
    const abs = safeJoin(ROOT, rel);
    await ensureDir(path.dirname(abs));
    await fs.writeFile(abs, body);
    const stat = await fs.stat(abs);
    return { storageKey: rel, sizeBytes: stat.size };
  },

  async get(storageKey: string): Promise<GetResult> {
    const abs = safeJoin(ROOT, storageKey);
    const body = await fs.readFile(abs);
    // MIME is tracked in DB; this is a best-effort for direct downloads.
    return {
      body,
      mimeType: "application/octet-stream",
      filename: path.basename(storageKey).replace(/^[0-9a-f-]+__/, ""),
    };
  },

  async delete(storageKey: string): Promise<void> {
    const abs = safeJoin(ROOT, storageKey);
    await fs.rm(abs, { force: true });
  },

  async publicUrl(storageKey: string): Promise<string | null> {
    return `/api/files/raw?key=${encodeURIComponent(storageKey)}`;
  },
};

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

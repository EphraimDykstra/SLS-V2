import type { StorageBackend } from "./types";
import { mockStorage } from "./mock";
import { sharepointStorage } from "./sharepoint";

let cached: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (cached) return cached;
  const backend = (process.env.STORAGE_BACKEND || "mock").toLowerCase();
  switch (backend) {
    case "sharepoint":
      cached = sharepointStorage;
      break;
    case "mock":
    default:
      cached = mockStorage;
      break;
  }
  return cached;
}

export type { StorageBackend } from "./types";

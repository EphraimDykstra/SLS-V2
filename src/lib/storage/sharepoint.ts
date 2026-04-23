import type { StorageBackend, PutInput, PutResult, GetResult } from "./types";

// Placeholder. Do NOT wire this up until IT/Security has:
//   1. Created an Entra ID app registration.
//   2. Granted it Sites.Selected (app-only).
//   3. Run POST /sites/{site-id}/permissions to scope it to the
//      ONE target site - NOT tenant-wide.
//   4. Recorded drive id + root folder id in .env.
//
// Access pattern we'll implement here:
//   - Client-credentials OAuth to graph.microsoft.com
//   - PUT /drives/{driveId}/items/{rootId}:/path/file:/content  for <4MB
//   - createUploadSession for larger files
//   - DELETE /drives/{driveId}/items/{itemId}
//   - storageKey = driveItem.id

export const sharepointStorage: StorageBackend = {
  name: "sharepoint",
  async put(_: PutInput): Promise<PutResult> {
    throw new Error("SharePoint backend not implemented yet. Set STORAGE_BACKEND=mock.");
  },
  async get(_: string): Promise<GetResult> {
    throw new Error("SharePoint backend not implemented yet.");
  },
  async delete(_: string): Promise<void> {
    throw new Error("SharePoint backend not implemented yet.");
  },
  async publicUrl(_: string): Promise<string | null> {
    return null;
  },
};

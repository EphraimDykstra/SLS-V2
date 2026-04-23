// Storage backend contract.
//
// Every backend (mock local FS today, SharePoint/Graph tomorrow)
// must implement this interface. The rest of the app only ever
// talks to `getStorage()` and never imports a concrete backend.

export type PutInput = {
  // Logical path inside the backend's root. The backend decides how
  // to map this (mock = real path; SharePoint = folder traversal).
  path: string;
  filename: string;
  mimeType: string;
  body: Buffer | Uint8Array;
};

export type PutResult = {
  // Opaque id the backend hands back; what we persist in DB.storageKey.
  storageKey: string;
  sizeBytes: number;
};

export type GetResult = {
  body: Buffer;
  mimeType: string;
  filename: string;
};

export interface StorageBackend {
  readonly name: string;

  put(input: PutInput): Promise<PutResult>;
  get(storageKey: string): Promise<GetResult>;
  delete(storageKey: string): Promise<void>;

  // For UI "open in SharePoint" links. Mock returns a local /api URL.
  publicUrl(storageKey: string): Promise<string | null>;
}

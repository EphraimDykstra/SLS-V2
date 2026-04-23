import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { prisma } from "@/lib/db";

// Dev helper for mock backend: stream a file by storageKey or by DB id.
// In production with SharePoint, replace with a redirect to a Graph
// download URL (issued per-request, short-lived).

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const key = url.searchParams.get("key");

  let storageKey: string | null = key;
  let mimeType = "application/octet-stream";
  let filename: string | undefined;

  if (id) {
    const f = await prisma.storedFile.findUnique({ where: { id } });
    if (!f) return NextResponse.json({ error: "not found" }, { status: 404 });
    storageKey = f.storageKey;
    mimeType = f.mimeType;
    filename = f.name;
  }
  if (!storageKey) {
    return NextResponse.json({ error: "id or key required" }, { status: 400 });
  }

  const out = await getStorage().get(storageKey);
  // NextResponse BodyInit typing is narrower than runtime accepts; a Blob
  // round-trip sidesteps it without copying interpretation.
  const blob = new Blob([new Uint8Array(out.body)], {
    type: mimeType || out.mimeType,
  });
  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": mimeType || out.mimeType,
      "Content-Disposition": `inline; filename="${filename ?? out.filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

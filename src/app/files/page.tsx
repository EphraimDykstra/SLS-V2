import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteButton } from "@/components/DeleteButton";
import { FILE_KINDS, FILE_KIND_LABEL, FileKind } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: { kind?: string; q?: string };
}) {
  const kindParam = searchParams.kind;
  const kind =
    kindParam && (FILE_KINDS as readonly string[]).includes(kindParam)
      ? (kindParam as FileKind)
      : undefined;
  const q = searchParams.q?.trim();

  const where: Record<string, unknown> = {};
  if (kind) where.kind = kind;
  if (q) where.name = { contains: q };

  const files = await prisma.storedFile.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    include: { uploadedBy: true, job: true },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">All files</h1>

      <form action="/files" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by filename…"
          className="input max-w-sm"
        />
        <select name="kind" defaultValue={kind ?? ""} className="select max-w-xs">
          <option value="">All kinds</option>
          {FILE_KINDS.map((k) => (
            <option key={k} value={k}>
              {FILE_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <button className="btn-secondary" type="submit">
          Filter
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Uploaded by</th>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No files.
                </td>
              </tr>
            )}
            {files.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <a
                    href={`/api/files/raw?id=${f.id}`}
                    className="text-brand-700 hover:underline"
                  >
                    {f.name}
                  </a>
                </td>
                <td className="px-4 py-2">
                  {FILE_KIND_LABEL[f.kind as FileKind] ?? f.kind}
                </td>
                <td className="px-4 py-2">
                  {f.job ? (
                    <Link
                      href={`/jobs/${f.jobId}`}
                      className="text-brand-700 hover:underline"
                    >
                      {f.job.name}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">{f.uploadedBy?.name}</td>
                <td className="px-4 py-2 text-slate-500">
                  {f.uploadedAt.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <DeleteButton
                    compact
                    url={`/api/files/${f.id}`}
                    confirm={`Delete ${f.name}?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

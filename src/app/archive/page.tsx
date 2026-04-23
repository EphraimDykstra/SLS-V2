import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();
  const where: Record<string, unknown> = { status: "archived" };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { notes: { contains: q } },
    ];
  }

  const jobs = await prisma.printJob.findMany({
    where,
    orderBy: { archivedAt: "desc" },
    include: { material: true, _count: { select: { files: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Archive</h1>
        <form action="/archive">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search archived jobs…"
            className="input"
          />
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Material</th>
              <th className="px-4 py-2">Files</th>
              <th className="px-4 py-2">Archived</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Nothing archived yet.
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {j.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={j.status} />
                </td>
                <td className="px-4 py-2">{j.material?.name ?? "—"}</td>
                <td className="px-4 py-2">{j._count.files}</td>
                <td className="px-4 py-2 text-slate-500">
                  {j.archivedAt?.toLocaleString() ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

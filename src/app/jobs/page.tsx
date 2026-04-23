import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { JOB_STATUSES } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = searchParams.status;
  const q = searchParams.q?.trim();

  const where: Record<string, unknown> = {
    status: { not: "archived" },
  };
  if (status && (JOB_STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { notes: { contains: q } },
    ];
  }

  const jobs = await prisma.printJob.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: { createdBy: true, material: true, _count: { select: { files: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Print queue</h1>
        <Link href="/jobs/new" className="btn-primary">
          New print job
        </Link>
      </div>

      <form className="flex gap-2" action="/jobs">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search jobs…"
          className="input max-w-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="select max-w-xs">
          <option value="">All active statuses</option>
          {JOB_STATUSES.filter((s) => s !== "archived").map((s) => (
            <option key={s} value={s}>
              {s}
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
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Material</th>
              <th className="px-4 py-2">Files</th>
              <th className="px-4 py-2">Created by</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No jobs match.
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
                  {j.description && (
                    <div className="text-xs text-slate-500 line-clamp-1">
                      {j.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={j.status} />
                </td>
                <td className="px-4 py-2">{j.priority}</td>
                <td className="px-4 py-2">{j.material?.name ?? "—"}</td>
                <td className="px-4 py-2">{j._count.files}</td>
                <td className="px-4 py-2">{j.createdBy?.name}</td>
                <td className="px-4 py-2 text-slate-500">
                  {j.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

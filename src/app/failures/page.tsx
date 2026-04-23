import Link from "next/link";
import { prisma } from "@/lib/db";
import { FAILURE_CATEGORIES, FAILURE_CATEGORY_LABEL } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function FailuresPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category;
  const where: Record<string, unknown> = {};
  if (category && (FAILURE_CATEGORIES as readonly string[]).includes(category)) {
    where.category = category;
  }

  const reports = await prisma.failureReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { reportedBy: true, job: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Failures</h1>

      <form action="/failures" className="flex gap-2">
        <select name="category" defaultValue={category ?? ""} className="select max-w-xs">
          <option value="">All categories</option>
          {FAILURE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {FAILURE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <button className="btn-secondary" type="submit">
          Filter
        </button>
      </form>

      <div className="card divide-y divide-slate-100">
        {reports.length === 0 && (
          <div className="p-6 text-sm text-slate-500">
            No failures logged{category ? ` in ${category}` : ""}.
          </div>
        )}
        {reports.map((r) => (
          <div key={r.id} className="p-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium text-red-800">{r.summary}</div>
              <Link
                href={`/jobs/${r.jobId}`}
                className="text-xs text-brand-600 hover:underline"
              >
                View job → {r.job.name}
              </Link>
            </div>
            <div className="text-xs text-slate-500">
              {FAILURE_CATEGORY_LABEL[r.category as keyof typeof FAILURE_CATEGORY_LABEL] ??
                r.category}{" "}
              · {r.reportedBy?.name} · {r.createdAt.toLocaleString()}
            </div>
            {r.details && (
              <p className="mt-2 text-slate-700 whitespace-pre-wrap">
                {r.details}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

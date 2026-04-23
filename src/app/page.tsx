import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const [queued, printing, postProcessing, archived, failures] =
    await Promise.all([
      prisma.printJob.count({ where: { status: "queued" } }),
      prisma.printJob.count({ where: { status: "printing" } }),
      prisma.printJob.count({ where: { status: "post_processing" } }),
      prisma.printJob.count({ where: { status: "archived" } }),
      prisma.failureReport.count(),
    ]);

  const recent = await prisma.printJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { createdBy: true, material: true },
  });

  const cards = [
    { label: "Queued", value: queued, href: "/jobs" },
    { label: "Printing", value: printing, href: "/jobs" },
    { label: "Post-processing", value: postProcessing, href: "/jobs" },
    { label: "Archived", value: archived, href: "/archive" },
    { label: "Failures logged", value: failures, href: "/failures" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/jobs/new" className="btn-primary">
          New print job
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card p-4 hover:border-brand-500 transition"
          >
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {c.label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {c.value}
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-medium">Recent jobs</h2>
          <Link href="/jobs" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.length === 0 && (
            <div className="p-6 text-sm text-slate-500">No jobs yet.</div>
          )}
          {recent.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <div className="font-medium">{j.name}</div>
                <div className="text-xs text-slate-500">
                  {j.createdBy?.name} · {j.material?.name ?? "no material"}
                </div>
              </div>
              <StatusBadge status={j.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

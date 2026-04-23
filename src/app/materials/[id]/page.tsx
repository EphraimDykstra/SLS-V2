import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  addAgingLog,
  deleteAgingLog,
  deleteMaterial,
} from "@/app/actions/materials";

export const dynamic = "force-dynamic";

export default async function MaterialDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const material = await prisma.material.findUnique({
    where: { id: params.id },
    include: {
      agingLogs: {
        orderBy: { recordedAt: "desc" },
        include: { recordedBy: true, file: true },
      },
      jobs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!material) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/materials" className="text-sm text-brand-600 hover:underline">
            ← All materials
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{material.name}</h1>
          <div className="text-sm text-slate-600">
            {material.type}
            {material.sku ? ` · ${material.sku}` : ""}
          </div>
          {material.notes && (
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
              {material.notes}
            </p>
          )}
        </div>
        <form action={deleteMaterial}>
          <input type="hidden" name="id" value={material.id} />
          <button
            className="btn-danger"
            type="submit"
            onClick={(e) => {
              if (!confirm("Delete this material? Aging logs will be removed.")) {
                e.preventDefault();
              }
            }}
          >
            Delete material
          </button>
        </form>
      </div>

      <section className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-medium">Aging / refresh logs</h2>
          <p className="text-xs text-slate-500">
            Record powder hours, refresh ratio, and attach any aging test
            reports.
          </p>
        </div>
        <div className="p-4 space-y-4">
          <form action={addAgingLog} className="grid grid-cols-2 md:grid-cols-4 gap-3" encType="multipart/form-data">
            <input type="hidden" name="materialId" value={material.id} />
            <div>
              <label className="label">Hours used</label>
              <input name="hoursUsed" type="number" step="0.1" className="input" />
            </div>
            <div>
              <label className="label">Refresh ratio (0–1)</label>
              <input name="refreshRatio" type="number" step="0.05" min={0} max={1} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Attach file (optional)</label>
              <input name="file" type="file" className="input" />
            </div>
            <div className="md:col-span-4">
              <label className="label">Notes</label>
              <textarea name="notes" rows={2} className="textarea" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button className="btn-primary" type="submit">
                Add log entry
              </button>
            </div>
          </form>

          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
            {material.agingLogs.length === 0 && (
              <li className="p-4 text-sm text-slate-500">No entries yet.</li>
            )}
            {material.agingLogs.map((log) => (
              <li key={log.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    {log.hoursUsed != null && (
                      <span className="mr-3">{log.hoursUsed} h</span>
                    )}
                    {log.refreshRatio != null && (
                      <span className="mr-3">
                        {(log.refreshRatio * 100).toFixed(0)}% refresh
                      </span>
                    )}
                    <span className="text-slate-500">
                      by {log.recordedBy?.name} ·{" "}
                      {log.recordedAt.toLocaleString()}
                    </span>
                  </div>
                  <form action={deleteAgingLog}>
                    <input type="hidden" name="id" value={log.id} />
                    <button className="text-xs text-red-600 hover:text-red-700">
                      Delete
                    </button>
                  </form>
                </div>
                {log.notes && (
                  <div className="mt-1 text-slate-700 whitespace-pre-wrap">
                    {log.notes}
                  </div>
                )}
                {log.file && (
                  <a
                    href={`/api/files/raw?id=${log.file.id}`}
                    className="text-brand-700 hover:underline text-xs"
                  >
                    📎 {log.file.name}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-medium">Jobs that used this material</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {material.jobs.length === 0 && (
            <div className="p-4 text-sm text-slate-500">None yet.</div>
          )}
          {material.jobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50"
            >
              <span className="font-medium">{j.name}</span>
              <span className="text-xs text-slate-500">
                {j.createdAt.toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

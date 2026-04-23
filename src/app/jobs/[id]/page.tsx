import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteButton } from "@/components/DeleteButton";
import {
  FAILURE_CATEGORIES,
  FAILURE_CATEGORY_LABEL,
  FILE_KINDS,
  FILE_KIND_LABEL,
  JOB_STATUSES,
  JOB_STATUS_LABEL,
} from "@/lib/domain";
import {
  addFailureReport,
  addPostProcessStep,
  deleteFailureReport,
  deleteJob,
  deleteStep,
  setJobStatus,
  toggleStep,
  uploadFilesAction,
} from "@/app/actions/jobs";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const job = await prisma.printJob.findUnique({
    where: { id: params.id },
    include: {
      createdBy: true,
      material: true,
      files: {
        orderBy: { uploadedAt: "desc" },
        include: { uploadedBy: true },
      },
      postProcessSteps: {
        orderBy: { order: "asc" },
        include: { completedBy: true },
      },
      failures: {
        orderBy: { createdAt: "desc" },
        include: { reportedBy: true, file: true },
      },
    },
  });

  if (!job) return notFound();

  const filesByKind = groupBy(job.files, (f) => f.kind);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/jobs" className="text-sm text-brand-600 hover:underline">
            ← Back to queue
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{job.name}</h1>
          <div className="mt-1 text-sm text-slate-600 flex flex-wrap gap-3">
            <StatusBadge status={job.status} />
            <span>Priority {job.priority}</span>
            <span>Qty {job.quantity}</span>
            <span>Material: {job.material?.name ?? "—"}</span>
            <span>Created by {job.createdBy?.name}</span>
            <span>{job.createdAt.toLocaleString()}</span>
          </div>
          {job.description && (
            <p className="mt-2 text-sm text-slate-700">{job.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          <form action={setJobStatus} className="flex items-center gap-2">
            <input type="hidden" name="jobId" value={job.id} />
            <select name="status" defaultValue={job.status} className="select">
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {JOB_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button className="btn-secondary" type="submit">
              Update
            </button>
          </form>
          <form action={deleteJob}>
            <input type="hidden" name="jobId" value={job.id} />
            <button
              type="submit"
              className="btn-danger"
              onClick={(e) => {
                if (
                  !confirm(
                    "Delete this job and all its files? This cannot be undone."
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              Delete job
            </button>
          </form>
        </div>
      </div>

      {job.notes && (
        <div className="card p-4">
          <div className="text-xs uppercase text-slate-500 mb-1">Notes</div>
          <div className="text-sm whitespace-pre-wrap">{job.notes}</div>
        </div>
      )}

      {/* Files */}
      <section className="card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-medium">Files</h2>
        </div>
        <div className="p-4 space-y-4">
          <form action={uploadFilesAction} className="flex items-end gap-2 flex-wrap">
            <input type="hidden" name="jobId" value={job.id} />
            <div className="flex-1 min-w-[240px]">
              <label className="label">Upload files</label>
              <input name="files" type="file" multiple className="input" />
            </div>
            <div>
              <label className="label">Kind</label>
              <select name="kind" className="select" defaultValue="design_stl">
                {FILE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {FILE_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Upload
            </button>
          </form>

          {FILE_KINDS.map((kind) => {
            const files = filesByKind.get(kind) ?? [];
            if (files.length === 0) return null;
            return (
              <div key={kind}>
                <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                  {FILE_KIND_LABEL[kind]}
                </h3>
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <a
                          href={`/api/files/raw?id=${f.id}`}
                          className="font-medium text-brand-700 hover:underline truncate block"
                        >
                          {f.name}
                        </a>
                        <div className="text-xs text-slate-500">
                          {humanSize(f.sizeBytes)} · uploaded by{" "}
                          {f.uploadedBy?.name} ·{" "}
                          {f.uploadedAt.toLocaleString()}
                        </div>
                      </div>
                      <DeleteButton
                        compact
                        url={`/api/files/${f.id}`}
                        confirm={`Delete ${f.name}?`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {job.files.length === 0 && (
            <div className="text-sm text-slate-500">No files yet.</div>
          )}
        </div>
      </section>

      {/* Post-processing */}
      <section className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-medium">Post-processing</h2>
          <p className="text-xs text-slate-500">
            Check off each step as the part goes through it. Add custom steps
            for parts that need special handling.
          </p>
        </div>
        <div className="p-4 space-y-3">
          <ul className="space-y-1">
            {job.postProcessSteps.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <form action={toggleStep} className="flex items-center gap-2 flex-1">
                  <input type="hidden" name="stepId" value={s.id} />
                  <button
                    type="submit"
                    className={
                      s.completedAt
                        ? "h-5 w-5 rounded border border-emerald-500 bg-emerald-500 text-white grid place-items-center"
                        : "h-5 w-5 rounded border border-slate-300 hover:border-slate-500"
                    }
                    aria-label="toggle"
                  >
                    {s.completedAt ? "✓" : ""}
                  </button>
                  <span className={s.completedAt ? "line-through text-slate-400" : ""}>
                    {s.name}
                  </span>
                  {s.completedAt && (
                    <span className="text-xs text-slate-500">
                      by {s.completedBy?.name} ·{" "}
                      {s.completedAt.toLocaleDateString()}
                    </span>
                  )}
                </form>
                <form action={deleteStep}>
                  <input type="hidden" name="stepId" value={s.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <form action={addPostProcessStep} className="flex items-end gap-2">
            <input type="hidden" name="jobId" value={job.id} />
            <div className="flex-1">
              <label className="label">Add a step</label>
              <input name="name" className="input" placeholder="e.g. Vapor smooth" />
            </div>
            <button className="btn-secondary" type="submit">
              Add
            </button>
          </form>
        </div>
      </section>

      {/* Failures */}
      <section className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-medium">Failure reports</h2>
        </div>
        <div className="p-4 space-y-3">
          {job.failures.length === 0 && (
            <div className="text-sm text-slate-500">
              No failures logged for this job.
            </div>
          )}
          {job.failures.map((rep) => (
            <div
              key={rep.id}
              className="rounded-md border border-red-200 bg-red-50 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-red-800">
                  {rep.summary}
                </div>
                <form action={deleteFailureReport}>
                  <input type="hidden" name="id" value={rep.id} />
                  <button className="text-xs text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </form>
              </div>
              <div className="text-xs text-red-700">
                {FAILURE_CATEGORY_LABEL[rep.category as keyof typeof FAILURE_CATEGORY_LABEL] ??
                  rep.category}{" "}
                · reported by {rep.reportedBy?.name} ·{" "}
                {rep.createdAt.toLocaleString()}
              </div>
              {rep.details && (
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                  {rep.details}
                </p>
              )}
            </div>
          ))}

          <form action={addFailureReport} className="space-y-2">
            <input type="hidden" name="jobId" value={job.id} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Summary</label>
                <input name="summary" required className="input" />
              </div>
              <div>
                <label className="label">Category</label>
                <select name="category" className="select" defaultValue="machine">
                  {FAILURE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {FAILURE_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Details</label>
              <textarea name="details" rows={2} className="textarea" />
            </div>
            <button className="btn-secondary" type="submit">
              Log failure
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function groupBy<T, K>(list: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of list) {
    const k = key(item);
    const arr = m.get(k) ?? [];
    arr.push(item);
    m.set(k, arr);
  }
  return m;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

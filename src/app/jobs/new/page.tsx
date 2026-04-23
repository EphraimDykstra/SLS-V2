import Link from "next/link";
import { prisma } from "@/lib/db";
import { createJob } from "@/app/actions/jobs";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const [materials, templates] = await Promise.all([
    prisma.material.findMany({ orderBy: { name: "asc" } }),
    prisma.postProcessTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link href="/jobs" className="text-sm text-brand-600 hover:underline">
          ← Back to queue
        </Link>
        <h1 className="text-2xl font-semibold mt-1">New print job</h1>
        <p className="text-sm text-slate-600">
          Upload design files now, or create the job first and attach files
          later.
        </p>
      </div>

      <form action={createJob} className="card p-5 space-y-4">
        <div>
          <label className="label">Job name</label>
          <input name="name" required className="input" placeholder="e.g. GearHousing-rev3" />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea name="description" rows={2} className="textarea" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Material</label>
            <select name="materialId" className="select">
              <option value="">— none selected —</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority (1 high – 5 low)</label>
            <input
              name="priority"
              type="number"
              min={1}
              max={5}
              defaultValue={3}
              className="input"
            />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              className="input"
            />
          </div>
          <div>
            <label className="label">Post-process template</label>
            <select name="postProcessTemplate" className="select" defaultValue="__default__">
              <option value="__default__">Default (standard SLS flow)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} className="textarea" />
        </div>

        <div>
          <label className="label">
            Initial files (STL, 3MF, .form, photos, docs)
          </label>
          <input name="files" type="file" multiple className="input" />
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/jobs" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary">
            Create job
          </button>
        </div>
      </form>
    </div>
  );
}

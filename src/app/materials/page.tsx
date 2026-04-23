import Link from "next/link";
import { prisma } from "@/lib/db";
import { createMaterial } from "@/app/actions/materials";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { agingLogs: true, jobs: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Materials</h1>

      <form action={createMaterial} className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="label">Name</label>
          <input name="name" required className="input" placeholder="e.g. Nylon 12 PA Batch-A" />
        </div>
        <div>
          <label className="label">Type</label>
          <input name="type" required className="input" placeholder="Nylon 12" />
        </div>
        <div>
          <label className="label">SKU</label>
          <input name="sku" className="input" />
        </div>
        <div>
          <label className="label">Notes</label>
          <input name="notes" className="input" />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button className="btn-primary" type="submit">
            Add material
          </button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Aging logs</th>
              <th className="px-4 py-2">Jobs used on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materials.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No materials yet.
                </td>
              </tr>
            )}
            {materials.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/materials/${m.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {m.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{m.type}</td>
                <td className="px-4 py-2">{m.sku ?? "—"}</td>
                <td className="px-4 py-2">{m._count.agingLogs}</td>
                <td className="px-4 py-2">{m._count.jobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

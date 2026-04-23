"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

type UserLite = { id: string; name: string; role: string; email: string };

export function TopBar({
  me,
  users,
}: {
  me: UserLite | null;
  users: UserLite[];
}) {
  const router = useRouter();

  async function switchUser(id: string) {
    await fetch("/api/auth/dev-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-brand-600 text-white grid place-items-center font-bold">
            S
          </div>
          <div className="font-semibold text-slate-800">SLS-V2</div>
          <span className="badge bg-slate-100 text-slate-600">dev</span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Acting as</span>
          <select
            className="select max-w-xs"
            value={me?.id ?? ""}
            onChange={(e) => switchUser(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}

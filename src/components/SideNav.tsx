"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Print queue" },
  { href: "/jobs/new", label: "New job" },
  { href: "/archive", label: "Archive" },
  { href: "/materials", label: "Materials" },
  { href: "/failures", label: "Failures" },
  { href: "/files", label: "All files" },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <nav className="p-3 space-y-1 text-sm">
        {links.map((l) => {
          const active =
            l.href === "/"
              ? pathname === "/"
              : pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "block rounded-md px-3 py-2",
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

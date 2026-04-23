"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({
  url,
  confirm = "Delete this item?",
  redirectTo,
  label = "Delete",
  compact = false,
}: {
  url: string;
  confirm?: string;
  redirectTo?: string;
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(confirm)) return;
    setBusy(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        alert("Delete failed: " + msg);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={compact ? "text-red-600 hover:text-red-700 text-xs" : "btn-danger"}
    >
      {busy ? "Deleting…" : label}
    </button>
  );
}

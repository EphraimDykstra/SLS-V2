import clsx from "clsx";
import { JOB_STATUS_LABEL, JobStatus } from "@/lib/domain";

const STYLES: Record<JobStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  printing: "bg-amber-100 text-amber-800",
  printed: "bg-sky-100 text-sky-800",
  post_processing: "bg-violet-100 text-violet-800",
  archived: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status as JobStatus) in STYLES ? (status as JobStatus) : "queued";
  return (
    <span className={clsx("badge", STYLES[s])}>
      {JOB_STATUS_LABEL[s] ?? status}
    </span>
  );
}

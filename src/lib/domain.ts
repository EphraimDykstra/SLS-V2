// Shared domain constants. Keep string unions in one place so
// the UI and DB agree.

export const JOB_STATUSES = [
  "queued",
  "printing",
  "printed",
  "post_processing",
  "archived",
  "failed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  printing: "Printing",
  printed: "Printed",
  post_processing: "Post-processing",
  archived: "Archived",
  failed: "Failed",
};

export const FILE_KINDS = [
  "design_stl",
  "design_3mf",
  "preform_form",
  "photo_raw",
  "photo_processed",
  "failure_doc",
  "postprocess_doc",
  "aging_log",
  "other",
] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  design_stl: "Design (STL)",
  design_3mf: "Design (3MF)",
  preform_form: "Preform (.form)",
  photo_raw: "Photo – as printed",
  photo_processed: "Photo – processed",
  failure_doc: "Failure documentation",
  postprocess_doc: "Post-process doc",
  aging_log: "Material aging log",
  other: "Other",
};

export const FAILURE_CATEGORIES = [
  "machine",
  "material",
  "design",
  "slice",
  "post_process",
  "other",
] as const;
export type FailureCategory = (typeof FAILURE_CATEGORIES)[number];

export const FAILURE_CATEGORY_LABEL: Record<FailureCategory, string> = {
  machine: "Machine",
  material: "Material",
  design: "Design",
  slice: "Slice / setup",
  post_process: "Post-processing",
  other: "Other",
};

export const DEFAULT_POSTPROCESS_STEPS = [
  "Depowder",
  "Bead blast",
  "Tumble / polish",
  "Dye",
  "Inspect",
  "Pack",
];

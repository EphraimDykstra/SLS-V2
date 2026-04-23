# SLS-V2

Internal file-management tool for SLS 3D printing: queue print jobs, attach
design and Preform files, track post-processing, log material aging, and
archive finished prints with photos.

> **Status:** scaffolded skeleton. Storage is a local filesystem mock behind a
> swappable interface. SharePoint / Microsoft Graph integration is stubbed and
> will be wired up once IT approves the app registration.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Prisma** ORM with **SQLite** for dev (swap to Postgres for prod)
- **Server actions** for mutations, thin **API routes** for file download /
  delete and the dev auth switcher
- Storage interface at `src/lib/storage/types.ts` — the app never imports a
  backend directly, it calls `getStorage()`

## Quick start

```bash
npm install
cp .env.example .env       # already have a dev .env committed-out in .gitignore
npm run db:push            # create dev.db from prisma/schema.prisma
npm run db:seed            # insert placeholder users, materials, jobs, files
npm run dev
```

Then open http://localhost:3000.

Use the "Acting as" dropdown in the top bar to switch between seeded users
(admin / operator / engineer). That simulates the multi-user flows until real
auth is wired in.

### Reset everything

```bash
npm run db:reset
```

## Project layout

```
prisma/
  schema.prisma          # data model
  seed.ts                # placeholder data
src/
  app/
    page.tsx             # dashboard
    jobs/                # queue, new, detail
    archive/             # finished prints
    materials/           # materials + aging logs
    failures/            # cross-job failure list
    files/               # all files
    api/
      auth/dev-switch/   # POST to change acting user (dev only)
      files/raw          # GET file by id or storageKey
      files/[id]         # DELETE a file
    actions/             # server actions (create job, upload, etc.)
  components/            # TopBar, SideNav, StatusBadge, DeleteButton
  lib/
    auth.ts              # getCurrentUser / role helpers (stub)
    db.ts                # Prisma client
    domain.ts            # shared constants (statuses, file kinds, categories)
    storage/
      types.ts           # StorageBackend interface
      mock.ts            # local FS backend (dev)
      sharepoint.ts      # placeholder (to be implemented)
      index.ts           # getStorage()
```

## Data model (high level)

- `User` — role is "engineer" | "operator" | "admin".
- `PrintJob` — status flows queued → printing → printed → post_processing →
  archived, with a "failed" branch.
- `StoredFile` — typed by `kind` (design_stl, design_3mf, preform_form,
  photo_raw, photo_processed, failure_doc, postprocess_doc, aging_log, other).
  Can be attached to a job, or free-standing (e.g. aging logs).
- `PostProcessStep` — per-job, ordered, check-off. New jobs get steps from a
  chosen `PostProcessTemplate` (or the default).
- `Material` + `MaterialAgingLog` — tracks powder batches, refresh ratios, and
  optional attached test reports.
- `FailureReport` — categorized, per-job, with optional photo/doc.

## File storage

The storage layer is a single interface:

```ts
interface StorageBackend {
  put(input: PutInput): Promise<PutResult>
  get(storageKey: string): Promise<GetResult>
  delete(storageKey: string): Promise<void>
  publicUrl(storageKey: string): Promise<string | null>
}
```

Today `STORAGE_BACKEND=mock` writes under `./storage/`. Each `StoredFile` row
in the DB holds an opaque `storageKey` that the backend knows how to resolve.

### Swapping in SharePoint later

When IT finishes the app registration:

1. Create an Entra ID app registration, **application (not delegated)** perms.
2. Grant ONLY `Sites.Selected` at the tenant level. This grants *no access
   yet* — the app can see nothing.
3. Have a SharePoint admin run:
   ```
   POST https://graph.microsoft.com/v1.0/sites/{target-site-id}/permissions
   {
     "roles": ["write"],
     "grantedToIdentities": [{ "application": { "id": "<app-id>", "displayName": "SLS-V2" } }]
   }
   ```
   This is the key step: it scopes the app to **only** that one site. It can
   never reach any other site/drive, even if the client secret leaks.
4. Record `tenantId`, `clientId`, `clientSecret`, `siteId`, `driveId`, and the
   target root folder id in `.env`.
5. Implement the four methods in `src/lib/storage/sharepoint.ts` (upload via
   `/drives/{driveId}/items/{rootId}:/path/file:/content` for files <4MB,
   `createUploadSession` for larger ones).
6. Set `STORAGE_BACKEND=sharepoint`.

Nothing else in the app changes — all pages, actions, and routes keep working
because they only talk to `getStorage()`.

## Security notes (today)

- Dev auth is a cookie-based user switcher. It is NOT real auth. Don't deploy
  as-is; swap `src/lib/auth.ts` for NextAuth + Entra ID before going to any
  shared environment.
- File-delete endpoint checks role: engineers can only delete files they
  uploaded; operators/admins can delete any.
- Path traversal is blocked in the mock storage backend (`safeJoin`).
- `.env` is gitignored. `storage/` and `prisma/dev.db` are too.

## What's deliberately NOT built yet

- Real auth (Microsoft Entra ID)
- SharePoint/Graph upload implementation
- Automation: auto-slice-for-quotes, printer integration
- Notifications
- Reporting / analytics
- Fine-grained per-folder permissions beyond the role check

Those are the next obvious extensions once the core flow is approved.

## Hosting options (for later)

- **Azure App Service** (Linux) — easiest path given the Microsoft 365 tenant;
  managed identities can authenticate to Graph without storing a client secret.
- **On-prem / self-hosted Docker** — viable if files are going to SharePoint
  anyway; the app itself is stateless except for the DB.
- **Vercel** — works fine for the UI but less ideal for an internal tool that
  needs VPN / Entra SSO and large uploads.

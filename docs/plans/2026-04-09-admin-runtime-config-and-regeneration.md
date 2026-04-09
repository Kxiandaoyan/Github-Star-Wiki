# Admin Runtime Config And Regeneration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `/admin` backend with env-backed login, editable runtime settings and prompts, plus a one-click batch regeneration flow for richer project content.

**Architecture:** Introduce a database-backed settings layer that seeds from `.env` defaults and overrides runtime configuration without requiring process restarts. Protect `/admin` and admin APIs with a signed cookie session based on env credentials, then route queue generation through prompt templates stored in settings so admins can update generation behavior and batch re-enqueue all projects.

**Tech Stack:** Next.js App Router, React 19, TypeScript, SQLite via `better-sqlite3`, existing queue processor and GitHub/LLM services

---

### Task 1: Add settings and content schema support

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/lib/settings.ts`

**Steps:**
1. Add `app_settings` table with key, value, category, label, description, secret flags, and timestamps.
2. Add project content columns for richer generated data, including structured sections and a serialized mind map.
3. Add helpers to seed settings from env defaults and fetch typed runtime settings with db overrides.
4. Keep search index rebuild and migrations compatible with existing data.

### Task 2: Refactor runtime services to use settings

**Files:**
- Modify: `src/lib/api-keys.ts`
- Modify: `src/lib/github.ts`
- Modify: `src/lib/app.ts`
- Modify: `src/lib/queue-concurrent.ts`
- Modify: `src/lib/llm.ts`

**Steps:**
1. Replace module-scope env constants with runtime lookups from settings.
2. Make API key synchronization read from settings instead of only `.env`.
3. Make queue concurrency and sync interval use runtime settings.
4. Update LLM generation to consume configurable prompt templates and emit richer content plus mind map data.

### Task 3: Add admin auth and protected APIs

**Files:**
- Create: `src/lib/admin-auth.ts`
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/app/api/admin/projects/regenerate-all/route.ts`
- Create: `src/app/api/admin/projects/[id]/regenerate/route.ts`

**Steps:**
1. Implement env-based admin credential verification.
2. Add signed cookie session helpers and server-side auth guard helpers.
3. Add settings read/update API with masking for secret values.
4. Add batch regenerate endpoint that resets project statuses and queues high-priority `generate_all` tasks.

### Task 4: Build `/admin` UI

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/components/admin/AdminDashboard.tsx`
- Create: `src/components/admin/AdminLoginForm.tsx`
- Create: `src/components/admin/AdminSettingsForm.tsx`
- Create: `src/components/admin/AdminActions.tsx`

**Steps:**
1. Add login page and redirect unauthenticated users.
2. Build dashboard sections for runtime settings, prompt templates, queue stats, and regenerate actions.
3. Keep UI aligned with existing visual language instead of inventing a separate admin theme.
4. Surface current prompt templates so they are visible and editable in the backend.

### Task 5: Show richer generated content on project pages

**Files:**
- Modify: `src/app/projects/[id]/page.tsx`
- Modify: `src/app/api/projects/[id]/route.ts`

**Steps:**
1. Expose structured generated sections and mind map data from the project detail API.
2. Render richer detail sections for purpose, problem solved, scenarios, installation, and usage when available.
3. Render a simple visual mind map from generated tree data without adding a heavy dependency.
4. Preserve fallback behavior for older records that do not yet have regenerated content.

### Task 6: Update docs and verify

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Steps:**
1. Document new admin env vars and runtime setting behavior.
2. Run lint and fix any type or style issues.
3. Sanity-check admin login, settings save, and regenerate queue paths.

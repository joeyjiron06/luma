# MP4 to WAV — Implementation Plan

**Date:** 2026-06-10
**Status:** Ready to build
**Route:** `/tools/mp4-to-wav`

## Context

The first Free Tool for the Luma site: a browser-based MP4-to-WAV converter using ffmpeg.wasm (single-threaded). Runs entirely client-side — no server upload, no account. Marketed as "MP4 to WAV" for the 16K monthly-search / KD 2 keyword, but quietly accepts common video/audio formats.

## Decision Summary

| Decision | Choice |
|---|---|
| Route | `/tools/mp4-to-wav` |
| Layout | New shared `BaseLayout.astro` |
| Theme | DESIGN.md-based theme scoped to tool pages; landing page keeps current dark theme |
| ffmpeg | `@ffmpeg/ffmpeg` single-threaded (no COOP/COEP headers) |
| Max file size | 2 GB |
| Batch | Single file per conversion (v1) |
| Input formats | `.mp4`, `.mkv`, `.mov`, `.avi`, `.webm`, `.m4a`, `.aac`, `.ogg`, `.flac`, `.mp3` — marketed as "MP4 to WAV" |
| Output | Default: 16-bit PCM / 44.1 kHz (`pcm_s16le -ar 44100`). "High quality" toggle: 24-bit / 48 kHz (`pcm_s24le -ar 48000`) |
| Upload component | Origin UI "Single image uploader w/ max size (drop area + button)" adapted for video/audio |
| Nav | Reuse existing `NavBar` component |
| CTA | Below the tool — soft Luma waitlist pitch |
| FAQ | ShadCN Accordion below the CTA |

## Dependencies to Install

```bash
cd site && pnpm add @ffmpeg/ffmpeg @ffmpeg/util
```

No other new npm dependencies. Origin UI's file upload hook and component are copy-pasted source (not an npm package).

## File Plan

### Phase 1 — Shared layout and tool theme

#### 1.1 Create `src/layouts/BaseLayout.astro`

Extract the shared HTML shell from `index.astro`:

- `<html>`, `<head>` (charset, viewport, favicon, generator)
- Configurable slots/props: `title`, `description`, `ogImage`, `ogUrl`, `themeColor`, `class` on `<html>`, `class` on `<body>`, JSON-LD schema
- Default: `<html lang="en">`, `<body class="min-h-screen bg-background text-foreground">`
- Named slot for `<head>` extras (page-specific meta, scripts)
- Default slot for body content
- Import `index.css` globally

#### 1.2 Create `src/pages/tools/tools.css`

A scoped CSS file for the tool theme derived from DESIGN.md tokens. Overrides the ShadCN oklch variables for tool pages only.

Key token mappings from DESIGN.md:

| DESIGN.md token | CSS custom property | Value |
|---|---|---|
| `colors.canvas` | `--background` | `#ffffff` |
| `colors.canvas-soft` | `--muted` | `#fafafa` |
| `colors.canvas-soft-2` | `--accent` | `#f5f5f5` |
| `colors.ink` / `colors.primary` | `--foreground`, `--primary` | `#171717` |
| `colors.on-primary` | `--primary-foreground` | `#ffffff` |
| `colors.body` | `--muted-foreground` | `#4d4d4d` |
| `colors.mute` | (secondary text) | `#888888` |
| `colors.hairline` | `--border` | `#ebebeb` |
| `colors.link` | `--ring`, `--link` | `#0070f3` |
| `colors.error` | `--destructive` | `#ee0000` |
| `rounded.pill` | `--radius` (buttons) | `100px` |
| `rounded.md` | `--radius` (cards) | `8px` |

This file does NOT have the `.dark` variant — tool pages are light-only (DESIGN.md is a light canvas system).

#### 1.3 Migrate existing pages to `BaseLayout.astro`

- `index.astro` — wrap in `BaseLayout`, keep `class="dark"` on `<html>`, move page-specific meta to props/slots
- `confirm.astro` — wrap in `BaseLayout`
- `privacy.astro` — wrap in `BaseLayout`

No visual changes to existing pages.

### Phase 2 — Origin UI file upload hook

#### 2.1 Create `src/hooks/use-file-upload.ts`

Copy Origin UI's `useFileUpload` hook from the coss.com/origin source. This provides:

- `files`, `isDragging`, `errors` state
- `handleDragEnter`, `handleDragLeave`, `handleDragOver`, `handleDrop` handlers
- `handleFileChange`, `openFileDialog`, `removeFile`, `clearFiles` actions
- `getInputProps` helper
- Config: `maxSize`, `accept`, `multiple`, `maxFiles`, `onFilesChange`

Configure for our use case:

```ts
useFileUpload({
  maxSize: 2 * 1024 * 1024 * 1024, // 2 GB
  accept: "video/mp4,video/x-matroska,video/quicktime,video/x-msvideo,video/webm,audio/mp4,audio/aac,audio/ogg,audio/flac,audio/mpeg",
  multiple: false,
})
```

#### 2.2 Create `src/components/ui/file-upload.tsx`

Origin UI's single file uploader with drop area + button, adapted:

- Dashed border drop zone with upload icon
- "Drag & drop or click to browse" prompt
- File type hint: "MP4, MOV, MKV, AVI, WebM, and audio files"
- Max size display: "Up to 2 GB"
- After file selection: show file name, size, remove button

### Phase 3 — ffmpeg.wasm service

#### 3.1 Create `src/lib/ffmpeg.ts`

A thin wrapper around `@ffmpeg/ffmpeg`:

```ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(onProgress?: (ratio: number) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();
  if (onProgress) {
    ffmpeg.on("progress", ({ ratio }) => onProgress(ratio));
  }

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export type Quality = "standard" | "high";

export async function convertToWav(
  file: File,
  quality: Quality = "standard",
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg(onProgress);

  const inputName = "input" + getExtension(file.name);
  const outputName = "output.wav";

  await ff.writeFile(inputName, await fetchFile(file));

  const codec = quality === "high" ? "pcm_s24le" : "pcm_s16le";
  const sampleRate = quality === "high" ? "48000" : "44100";

  await ff.exec(["-i", inputName, "-vn", "-acodec", codec, "-ar", sampleRate, outputName]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return new Blob([data], { type: "audio/wav" });
}
```

Key decisions:
- Load ffmpeg core from unpkg CDN (no need to self-host WASM files)
- `-vn` flag strips video, only processes audio stream
- Lazy-load: ffmpeg binary only fetched when user clicks "Convert"
- Singleton pattern: reuse loaded instance across conversions

#### 3.2 Vite config: exclude ffmpeg from dep optimization

Add to `astro.config.mjs`:

```js
vite: {
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
}
```

### Phase 4 — Tool page component

#### 4.1 Create `src/components/tools/Mp4ToWavConverter.tsx`

The main React island component. State machine:

```
idle → fileSelected → loading (ffmpeg init) → converting → done → idle
```

States and UI:

| State | UI |
|---|---|
| `idle` | Drop zone (file-upload component) + quality toggle |
| `fileSelected` | File info (name, size) + quality toggle + "Convert to WAV" button |
| `loading` | "Loading converter..." with spinner |
| `converting` | Progress bar with percentage |
| `done` | "Download WAV" button + file size + "Convert another" link |
| `error` | Error message + "Try again" link |

Components used:
- `file-upload.tsx` (Origin UI adapted) — drop zone
- `Button` (ShadCN) — convert + download actions
- `Switch` (ShadCN) — "High quality" toggle with label
- ShadCN `Progress` — install via `npx shadcn@latest add progress`

Quality toggle: positioned below the drop zone, shows "Standard (44.1 kHz, 16-bit)" / "High quality (48 kHz, 24-bit)" with the existing ShadCN Switch.

Download: create an object URL from the output Blob, trigger download with the original filename stem + `.wav`.

#### 4.2 Create `src/components/tools/Mp4ToWavFaq.tsx`

ShadCN Accordion with 5-6 questions:

1. "What is WAV format?" — uncompressed audio, lossless, widely compatible
2. "Is my file uploaded to a server?" — no, everything runs in your browser using WebAssembly. Your files never leave your device.
3. "What's the difference between standard and high quality?" — sample rate and bit depth explanation
4. "What file formats are supported?" — MP4, MOV, MKV, AVI, WebM, plus audio formats
5. "Is there a file size limit?" — 2 GB. For larger files, use desktop FFmpeg.
6. "How long does conversion take?" — depends on file size and device; a 100 MB file typically converts in under 30 seconds

#### 4.3 Create `src/components/tools/LumaCta.tsx`

A simple CTA section:
- Headline: "Need studio-quality audio?"
- Body: "Luma removes background noise and turns rough recordings into clean, professional audio."
- Button: "Join the waitlist" → links to `/#waitlist`
- Uses `card-soft` styling from DESIGN.md (`canvas-soft` background, `rounded.md`)

### Phase 5 — Astro page

#### 5.1 Create `src/pages/tools/mp4-to-wav.astro`

```astro
---
import BaseLayout from "@/layouts/BaseLayout.astro";
import NavBar from "@/components/landingPage/sections/navBar";
import Mp4ToWavConverter from "@/components/tools/Mp4ToWavConverter";
import Mp4ToWavFaq from "@/components/tools/Mp4ToWavFaq";
import LumaCta from "@/components/tools/LumaCta";
import "./tools.css";
---

<BaseLayout
  title="MP4 to WAV Converter — Free, No Upload | Luma"
  description="Convert MP4 to WAV online for free. No upload needed — runs entirely in your browser. Extract high-quality audio from video files instantly."
  ogUrl="https://luma.pub/tools/mp4-to-wav"
>
  <NavBar />

  <main class="container max-w-2xl mx-auto py-12">
    <h1>Convert MP4 to WAV.</h1>
    <p>Extract audio from video files — free, private, no upload required.</p>

    <Mp4ToWavConverter client:load />

    <LumaCta />

    <Mp4ToWavFaq client:load />
  </main>
</BaseLayout>
```

SEO:
- Title tag: "MP4 to WAV Converter — Free, No Upload | Luma"
- Meta description targets the keyword + privacy angle
- H1 contains "Convert MP4 to WAV" (exact keyword match)
- JSON-LD: `WebApplication` schema with `applicationCategory: "MultimediaApplication"`
- No `class="dark"` on `<html>` — tool pages use the light DESIGN.md theme

Page structure top-to-bottom:
1. NavBar (reused)
2. H1 + subtitle
3. Converter (drop zone → progress → download)
4. Luma CTA section
5. FAQ Accordion

### Phase 6 — Install missing ShadCN components

```bash
cd site && npx shadcn@latest add progress
```

The Accordion, Button, Switch, Card, and Label are already installed.

## File Tree (new/modified)

```
site/
├── astro.config.mjs                          # modified — add optimizeDeps.exclude
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro                  # new
│   ├── hooks/
│   │   └── use-file-upload.ts                # new (Origin UI hook)
│   ├── lib/
│   │   ├── utils.ts                          # existing
│   │   └── ffmpeg.ts                         # new
│   ├── components/
│   │   ├── ui/
│   │   │   ├── file-upload.tsx               # new (Origin UI adapted)
│   │   │   └── progress.tsx                  # new (ShadCN add)
│   │   └── tools/
│   │       ├── Mp4ToWavConverter.tsx          # new
│   │       ├── Mp4ToWavFaq.tsx               # new
│   │       └── LumaCta.tsx                   # new
│   └── pages/
│       ├── index.astro                       # modified — use BaseLayout
│       ├── confirm.astro                     # modified — use BaseLayout
│       ├── privacy.astro                     # modified — use BaseLayout
│       └── tools/
│           ├── tools.css                     # new — DESIGN.md tool theme
│           └── mp4-to-wav.astro              # new
└── docs/
    └── plans/
        └── 001-mp4-to-wav-tool.md            # this file
```

## Build Order

1. **Phase 1** — Layout + theme (no new functionality, just refactor)
2. **Phase 2** — File upload hook + component (static UI, no ffmpeg yet)
3. **Phase 3** — ffmpeg service (can test in isolation)
4. **Phase 4** — Wire converter component together
5. **Phase 5** — Astro page + SEO
6. **Phase 6** — Install progress component

Phases 2 and 3 can run in parallel. Phase 1 must complete first (layout needed by the page). Phase 4 depends on 2 + 3.

## Phase 7 — Verification Loop

**Do not consider the work complete until every acceptance criterion below passes. If any criterion fails, fix it and re-verify. Keep iterating until all pass.**

### How to verify

1. Run `cd /home/joey/programs/luma/site && pnpm build` — must exit 0 with no errors.
2. Run `cd /home/joey/programs/luma/site && pnpm dev` and confirm the dev server starts.
3. Check for TypeScript / linter errors: run lints on all new and modified files.

### Acceptance Criteria

| # | Criterion | How to check |
|---|-----------|-------------|
| 1 | `pnpm build` succeeds with zero errors | Build output shows no errors |
| 2 | No TypeScript errors in new/modified files | Linter reports clean |
| 3 | Existing pages (`/`, `/confirm`, `/privacy`) still render without visual regression | Dev server: pages load, no console errors, NavBar visible |
| 4 | `/tools/mp4-to-wav` route exists and renders | Dev server: page loads at `http://localhost:4321/tools/mp4-to-wav` |
| 5 | Tool page uses light DESIGN.md theme (not dark landing page theme) | Page has white/light canvas background, ink text, no `.dark` class on `<html>` |
| 6 | Drop zone renders and accepts file selection via click and drag | Visual check: dashed border area with upload icon and "Drag & drop or click to browse" text |
| 7 | File size validation rejects files over 2 GB | Test: select a file > 2 GB (or mock), error message appears |
| 8 | Quality toggle switches between Standard and High quality | Visual check: toggle changes label text |
| 9 | ffmpeg.wasm loads lazily on first conversion (not on page load) | Network tab: no ffmpeg-core.wasm request until "Convert" is clicked |
| 10 | Conversion produces a downloadable `.wav` file | End-to-end: drop a small `.mp4`, click Convert, download completes with `.wav` extension |
| 11 | Progress bar shows during conversion | Visual check: progress bar appears and advances |
| 12 | "Convert another" resets to idle state | After download, clicking reset returns to drop zone |
| 13 | NavBar matches existing landing page NavBar | Visual comparison: same logo, same "Get Early Access" button |
| 14 | Luma CTA section renders below the converter | Visual check: "Need studio-quality audio?" section visible |
| 15 | FAQ Accordion renders below the CTA with 5-6 items | Visual check: accordion items expand/collapse |
| 16 | Page `<title>` contains "MP4 to WAV" | View page source or document.title check |
| 17 | Meta description is set and contains target keyword | View page source |
| 18 | `BaseLayout.astro` is used by all pages (no duplicated HTML shells) | Grep: no raw `<html>` tags in page files except layout |

### Iteration protocol

- After completing Phase 6, run the build check (criterion 1-2).
- Fix any build/type errors before proceeding to visual checks.
- Start the dev server and verify criteria 3-18.
- For any failure: fix the issue, re-build, re-verify the failed criterion AND all criteria that might be affected by the fix.
- Only mark the work complete when all 18 criteria pass.

## Phase 8 — Branch, Commit & Pull Request

Once all Phase 7 acceptance criteria pass:

1. Create a new git branch from `main`:
   ```bash
   git checkout -b feat/mp4-to-wav-tool
   ```
2. Stage and commit all new and modified files:
   ```bash
   git add -A
   git commit -m "feat: add browser-based MP4 to WAV converter tool"
   ```
3. Push the branch and open a Pull Request (best-effort — skip if push/PR fails, e.g. no remote permissions):
   ```bash
   git push -u origin feat/mp4-to-wav-tool
   gh pr create --title "feat: MP4 to WAV converter tool" --body "Adds a browser-based MP4-to-WAV converter at /tools/mp4-to-wav using ffmpeg.wasm. See site/docs/plans/001-mp4-to-wav-tool.md for full plan."
   ```

If `gh` is not installed or the push/PR creation fails for any reason, that's fine — the branch and commit are the minimum deliverable.

## Out of Scope

- Landing page redesign to DESIGN.md tokens (separate effort)
- Batch file conversion
- `/tools` index page (build when there are 3+ tools)
- Multi-threaded ffmpeg (upgrade path if performance complaints arise)
- Analytics / usage tracking

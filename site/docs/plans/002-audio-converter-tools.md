# Audio Converter Tools — Implementation Plan

**Date:** 2026-06-12
**Status:** Ready to build
**Route pattern:** `/audio/{slug}` (e.g. `/audio/mp4-to-wav`)
**Scope:** Refactor the existing MP4-to-WAV tool into a reusable converter and generate 144 SEO landing pages from `docs/audio-combos.md`.

## Context

The first free tool (`001-mp4-to-wav-tool.md`) proved the ffmpeg.wasm approach. The next step is to scale it into a fleet of format-specific landing pages — one per conversion pair in `docs/audio-combos.md` — to capture long-tail search traffic for video→audio and audio→audio conversions.

Each page is a pre-rendered Astro route with page-specific SEO copy, but shares one React converter component. Conversion runs entirely in the browser; no server upload.

## Decision Summary

| Decision | Choice |
|---|---|
| Route | `/audio/{slug}` via `src/pages/audio/[slug].astro` |
| Page count | All 144 combos ship at once |
| React component | Single `AudioConverter.tsx` (converter UI + FAQ accordion) |
| Output format | Pre-select via `defaultFormat` prop; user can always change it |
| Input files | Permissive — accept all common video/audio (same as today) |
| Page config | Fully populated objects in `audioConverterCombos.ts` — no runtime SEO mapping |
| FAQ | Generic on every page; no per-page overrides |
| Re-encode pages | Same input/output pairs use "Re-encode" copy instead of "Convert X to X" |
| Old route | Redirect `/tools/mp4-to-wav` → `/audio/mp4-to-wav` |

## Dependencies

No new npm dependencies. Existing:

- `@ffmpeg/ffmpeg` / `@ffmpeg/util` — conversion engine
- ShadCN UI components — upload, settings, accordion

## File Plan

### Phase 1 — Types and combo data

#### 1.1 Create `src/lib/audio/types.ts`

```typescript
import type { AudioFormat } from "@/lib/ffmpeg";

export type AudioConverterPageConfig = {
  slug: string;
  defaultFormat: AudioFormat;
  title: string;
  description: string;
  h1: string;
  subtitle: string;
  ogUrl: string;
  jsonLdName: string;
};
```

Each config object contains every prop needed to render a page. No derived fields at render time.

#### 1.2 Create `src/lib/audio/audioConverterCombos.ts`

Export `AUDIO_CONVERTER_COMBOS: AudioConverterPageConfig[]` — 144 fully populated entries, one per pair in `docs/audio-combos.md`.

Example entries:

```typescript
{
  slug: "mp4-to-wav",
  defaultFormat: "wav",
  title: "MP4 to WAV Converter — Free, No Upload | Luma",
  description: "Convert MP4 to WAV online for free. No upload needed — runs entirely in your browser. Extract high-quality audio from video files instantly.",
  h1: "Convert MP4 to WAV.",
  subtitle: "Extract audio from video files — free, private, no upload required.",
  ogUrl: "https://luma.pub/audio/mp4-to-wav",
  jsonLdName: "MP4 to WAV Converter",
},
{
  slug: "mp3-to-mp3",
  defaultFormat: "mp3",
  title: "MP3 Re-encoder — Free, No Upload | Luma",
  description: "Re-encode MP3 online for free. Adjust bitrate, sample rate, and channels in your browser — no upload required.",
  h1: "Re-encode MP3.",
  subtitle: "Change bitrate, sample rate, and channels — free, private, no upload required.",
  ogUrl: "https://luma.pub/audio/mp3-to-mp3",
  jsonLdName: "MP3 Re-encoder",
},
```

**Copy templates for the generator script** (used once to populate the file, not at runtime):

| Kind | How to detect | title / jsonLdName | h1 | subtitle |
|---|---|---|---|---|
| Video → audio | Input is a video format | `{INPUT} to {OUTPUT} Converter — Free, No Upload \| Luma` | `Convert {INPUT} to {OUTPUT}.` | Extract audio from video files — free, private, no upload required. |
| Audio → audio | Input is audio, input ≠ output | Same as above | Same as above | Convert audio files online — free, private, no upload required. |
| Re-encode | input === output | `{INPUT} Re-encoder — Free, No Upload \| Luma` | `Re-encode {INPUT}.` | Change bitrate, sample rate, and channels — free, private, no upload required. |

Format labels use uppercase (MP4, WAV, etc.). Slug is `{input}-to-{output}`.

**Video formats:** mp4, mov, mkv, webm, avi, mpeg, flv, wmv, 3gp, m4v

**Audio formats:** mp3, wav, aac, m4a, flac, ogg, opus, aiff

#### 1.3 Create `scripts/generate-audio-combos.ts` (optional but recommended)

One-time generator that reads `docs/audio-combos.md` and writes `src/lib/audio/audioConverterCombos.ts`. Keeps the 144-entry file in sync with the markdown source. Run manually when combos change:

```bash
cd site && pnpm tsx scripts/generate-audio-combos.ts
```

### Phase 2 — ffmpeg opus support

#### 2.1 Update `src/lib/ffmpeg.ts`

Add `opus` to:

- `AudioFormat` union type
- `AUDIO_FORMATS` array (label: "Opus")
- `buildCodecArgs` — `-codec:a libopus -b:a {bitrate}k`
- `mimeTypeForFormat` — `audio/opus`

Required before shipping pages that default to opus output.

### Phase 3 — AudioConverter component

#### 3.1 Create `src/components/tools/AudioConverter.tsx`

Rename/refactor from `Mp4ToWavConverter.tsx`.

**Props:**

```typescript
type AudioConverterProps = {
  defaultFormat: AudioFormat;
};
```

**Behavior:**

- Initialize `format` state from `defaultFormat` prop
- Format picker remains visible and changeable (no lock)
- `FileUpload` stays permissive (no per-page accept restriction)
- Existing settings panel unchanged (channels, bitrate, volume, sample rate)

**Embedded FAQ** (moved from `Mp4ToWavFaq.tsx`, rendered below the convert button):

| # | Question | Answer |
|---|---|---|
| 1 | Is my file uploaded to a server? | No. Everything runs entirely in your browser using WebAssembly. Your files never leave your device — there's no server upload, no account required, and nothing is stored. |
| 2 | What settings can I adjust? | Use the Settings panel to change output format, channels (mono or stereo), bitrate, volume, and sample rate before converting. |
| 3 | What file formats are supported? | You can upload common video files (MP4, MOV, MKV, AVI, WebM, and more) and audio files (MP3, WAV, AAC, M4A, FLAC, OGG, Opus, AIFF). Choose any supported output format from the format picker. |
| 4 | Is there a file size limit? | Yes, the maximum file size is 2 GB. For larger files, we recommend using desktop FFmpeg directly. |
| 5 | How long does conversion take? | It depends on the file size and your device's processing power. A 100 MB file typically converts in under 30 seconds on a modern computer. |

Changes from current FAQ:

- **Removed:** "What is WAV format?" (format-specific)
- **Reworded:** "What's the difference between standard and high quality?" → "What settings can I adjust?" (matches actual UI)

Same FAQ copy on every page — no props, no overrides.

#### 3.2 Delete old components

- `src/components/tools/Mp4ToWavConverter.tsx`
- `src/components/tools/Mp4ToWavFaq.tsx`

### Phase 4 — Dynamic Astro route

#### 4.1 Create `src/pages/audio/[slug].astro`

Pass-through page — reads config from props, no mapping:

```astro
---
import BaseLayout from "@/layouts/BaseLayout.astro";
import NavBar from "@/components/landingPage/sections/navBar";
import AudioConverter from "@/components/tools/AudioConverter";
import LumaCta from "@/components/tools/LumaCta";
import { AUDIO_CONVERTER_COMBOS } from "@/lib/audio/audioConverterCombos";
import type { AudioConverterPageConfig } from "@/lib/audio/types";

export function getStaticPaths() {
  return AUDIO_CONVERTER_COMBOS.map((config) => ({
    params: { slug: config.slug },
    props: { config },
  }));
}

interface Props {
  config: AudioConverterPageConfig;
}

const { config } = Astro.props;
---

<BaseLayout
  title={config.title}
  description={config.description}
  ogUrl={config.ogUrl}
  themeColor="#ffffff"
  htmlClass="dark"
  jsonLd={{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: config.jsonLdName,
    description: config.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }}
>
  <NavBar />
  <main class="container max-w-4xl mx-auto py-12">
    <h1 class="text-2xl font-semibold tracking-tight">{config.h1}</h1>
    <p class="mt-2 text-muted-foreground text-sm">{config.subtitle}</p>

    <div class="mt-8">
      <AudioConverter client:load defaultFormat={config.defaultFormat} />
    </div>

    <LumaCta client:load />
  </main>
</BaseLayout>
```

Note: FAQ is inside `AudioConverter`, not in the Astro page. `LumaCta` stays between converter and FAQ is wrong — FAQ is inside AudioConverter after the convert button. Layout order:

1. h1 + subtitle (Astro)
2. AudioConverter — upload, settings, convert button, FAQ (React)
3. LumaCta (React)

#### 4.2 Delete old page

- `src/pages/tools/mp4-to-wav.astro`

#### 4.3 Add redirect

In `astro.config.mjs`:

```javascript
redirects: {
  "/tools/mp4-to-wav": "/audio/mp4-to-wav",
},
```

### Phase 5 — Cleanup and verification

#### 5.1 Update references

- Search codebase for `Mp4ToWav`, `/tools/mp4-to-wav`, `Mp4ToWavFaq`
- Update any links in landing page, sitemap, or docs

#### 5.2 Sitemap

If a sitemap exists or is added later, include all `/audio/*` routes from `AUDIO_CONVERTER_COMBOS`.

## Target File Structure

```
site/
  docs/
    audio-combos.md                          # source of truth for pairs (human-readable)
    plans/
      002-audio-converter-tools.md           # this plan
  scripts/
    generate-audio-combos.ts                 # optional generator
  src/
    components/tools/
      AudioConverter.tsx                     # converter + FAQ
      LumaCta.tsx                            # unchanged
    lib/
      audio/
        types.ts                             # AudioConverterPageConfig
        audioConverterCombos.ts              # 144 fully populated configs
      ffmpeg.ts                              # + opus support
    pages/
      audio/
        [slug].astro                         # dynamic route, 144 static pages
  astro.config.mjs                           # + redirect
```

**Deleted:**

```
src/components/tools/Mp4ToWavConverter.tsx
src/components/tools/Mp4ToWavFaq.tsx
src/pages/tools/mp4-to-wav.astro
```

## What Stays Unchanged

- `convertToAudio()` in `ffmpeg.ts` — already format-agnostic (plus opus addition)
- `LumaCta` — same on every page
- `BaseLayout` — already supports configurable SEO props
- `FileUpload` — permissive accept, 2 GB max
- Browser-only / no-upload positioning
- Tool page theme (light canvas via BaseLayout props)

## Verification Checklist

| # | Check | How |
|---|---|---|
| 1 | Build succeeds with 144 static pages | `pnpm build` — no errors, 144 `/audio/*` routes in output |
| 2 | `/audio/mp4-to-wav` renders correctly | Dev server: page loads, h1/title match config |
| 3 | `/audio/mp3-to-mp3` uses re-encode copy | h1 is "Re-encode MP3." |
| 4 | Default format pre-selected per page | `/audio/mp4-to-mp3` has MP3 selected in format picker |
| 5 | User can change output format | Select WAV on mp4-to-mp3 page, convert works |
| 6 | Opus output works | Convert a file to opus on an opus-default page |
| 7 | FAQ renders inside converter | 5 items, no "What is WAV format?" |
| 8 | Old route redirects | `/tools/mp4-to-wav` → `/audio/mp4-to-wav` |
| 9 | Conversion still works | Upload MP4, convert to WAV, file downloads |
| 10 | No references to old component names | `grep -r Mp4ToWav src/` returns nothing |

## Implementation Order

1. Add opus to `ffmpeg.ts`
2. Create `types.ts` and generator script
3. Run generator → `audioConverterCombos.ts` (144 entries)
4. Create `AudioConverter.tsx` (refactor + merge FAQ)
5. Create `pages/audio/[slug].astro`
6. Add redirect in `astro.config.mjs`
7. Delete old files (`Mp4ToWavConverter`, `Mp4ToWavFaq`, `mp4-to-wav.astro`)
8. Build and verify checklist

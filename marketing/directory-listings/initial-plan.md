# Directory Listings — Initial Plan

A strategy for reaching 100 **Directory Listings** as part of the **Content Loop** defined in `marketing/CONTEXT.md`.

## Goal

Submit Luma and future **Free Tools** to ~100 external directories where they are a genuine fit — earning **Backlinks**, referral traffic, and **Luma Interest** without burning out on low-quality aggregators.

## Core insight

You won't get 100 *good* listings by submitting Luma once to 100 places. You'll get there by:

1. **Launch batch** — Luma waitlist (~25–30 high-fit directories)
2. **Free Tool waves** — each **Tool Page** gets its own batch (~15–20 each)
3. **Milestone refreshes** — beta, Mac App Store, major features trigger resubmits/updates

Example math: 30 + (4 Free Tools × 17) ≈ **98 listings** with real relevance, not duplicate spam.

## What to submit (and when)

| Asset | When | Directory angle |
|-------|------|-----------------|
| **Luma waitlist** | Now | Mac app for studio-quality vocal cleanup — local, private, no subscription |
| **Free Tools** | As shipped | Search-intent utilities (noise removal, etc.) — easier to get accepted |
| **Luma v1** | At launch | Re-hit top 20 + launch-specific directories |

Many directories reject pre-launch products. Tier them so effort isn't wasted on directories that require a live demo.

## Directory tiers

Score each candidate 1–5 on:

- **Audience fit** — Creator-Editor > generic startup > builder-only
- **Acceptance likelihood** — waitlist OK vs. needs live product
- **Backlink value** — dofollow, relevant category, not a link farm
- **Effort** — 2 min form vs. manual review vs. paid

**Target mix for 100:**

- ~20 Tier A (high fit, real traffic/backlinks)
- ~30 Tier B (decent fit, moderate effort)
- ~50 Tier C (long-tail aggregators — batch these, low customization)

Skip anything that's clearly a link farm. They hurt more than they help.

## Category map

| Category | ~Count | Notes |
|----------|--------|-------|
| Creator / podcast / audio tools | 20 | Podcast gear lists, audio editing roundups, creator tool hubs |
| Mac / desktop apps | 15 | Mac app directories, indie Mac software lists |
| AI tools (local/private angle) | 15 | "Runs on your machine" is a differentiator |
| Startup / product launch | 15 | Waitlist-friendly directories first; Product Hunt at launch |
| Indie / maker | 15 | Build-in-public communities, indie product galleries |
| Free tool directories | 20 | Per **Marketing Engineering** tool — the volume engine |

## Asset kit

Build once in `marketing/directory-listings/asset-kit.md`, reuse for every submission.

Contents:

- **One-liner** (60 chars)
- **Short description** (160 chars — meta/social)
- **Long description** (300 / 500 / 1000 word variants)
- **Tags**: `audio cleanup`, `noise removal`, `podcast`, `youtube`, `mac app`, `local AI`, `privacy`, `vocal enhancement`
- **URLs**: waitlist, site, Twitter/X, YouTube
- **Screenshots**: app UI, before/after audio waveform if available
- **Founder bio** (2 sentences)
- **FAQ answers**: pricing (TBD), platforms (Mac first), cloud (no uploads)

Every submission session, tailor copy from this kit per directory.

## Backlog tracker

Maintain `marketing/directory-listings/backlog.csv` with columns:

```
name | url | category | tier | waitlist_ok | dofollow | status | submitted_date | notes
```

Status values: `candidate`, `ready`, `submitted`, `accepted`, `rejected`, `skipped`

## How to use Mark (repeatable sessions)

### Session 1 — Build the inventory

> "Mark, build a directory backlog for Luma waitlist. Score Tier A/B/C. Group by category. Flag waitlist-friendly vs. needs-live-product."

Output: scored backlog of 120+ candidates.

### Session 2 — Asset kit

> "Mark, draft the directory asset kit from CONTEXT.md and the landing page."

### Session 3+ — Submission batches (10–15 per session)

> "Mark, batch N: give me copy-paste fields for these 12 directories."

Per directory, Mark provides:

- Title
- Tagline
- Description (length-matched to their form)
- Category selection
- Tags
- Anything unique to that site's audience

Joey submits manually, then updates the tracker.

### Ongoing — Per Free Tool

> "Mark, new Free Tool shipped: [name]. Give me 15 directory submissions tailored to [pain point]."

## Phased timeline to 100

```
Week 1-2:  Asset kit + backlog (target 120 candidates, submit ~25 Tier A/B)
Week 3-4:  Batch submit 25 more (Tier B/C)
Month 2:   First Free Tool → 15-20 directory submissions
Month 3:   Second Free Tool → 15-20 more
Month 4:   Third Free Tool + Luma milestone refresh → 20-25
Ongoing:   5-10/month maintenance + new tool waves
```

## Leading indicators

From `marketing/CONTEXT.md`:

- Accepted listings per week
- Dofollow **Backlinks** acquired
- Referral traffic from directory UTMs (`?utm_source=betalist&utm_medium=directory`)

## Rules

1. **Never identical copy** — vary descriptions per directory; moderators and search engines notice duplicates.
2. **UTM every link** — `luma.app/?utm_source=<directory>&utm_medium=directory`
3. **Submit Free Tools to tool directories, Luma to app directories** — wrong category = rejection or junk traffic.
4. **Product Hunt is a launch event, not a listing** — save it for when there is something to demo.
5. **Track rejections** — if 3+ similar directories reject waitlist-only, pause that category until beta.

## Prerequisites (fill in before Session 1)

- [ ] Waitlist URL live (domain + path)
- [ ] Mac-only for now, or Windows planned — document in asset kit
- [ ] List of any directories already submitted to
- [ ] Screenshots ready for submission forms

## Next files to create

1. `marketing/directory-listings/asset-kit.md`
2. `marketing/directory-listings/backlog.csv`
3. `marketing/directory-listings/batches/` — per-batch submission copy as sessions complete

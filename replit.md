# Quran Reader

A complete Quran web application for reading, searching, listening to, and bookmarking verses from all 114 Surahs.

## Run & Operate

- `pnpm --filter @workspace/quran-app run dev` — run the Quran frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, framer-motion, wouter
- Data: `quran-json` (static, bundled) — no backend required
- Audio: Al-Quran Cloud CDN (`cdn.islamic.network`)
- Persistence: localStorage (bookmarks only)

## Where things live

- `artifacts/quran-app/src/pages/` — Home, Surah reading, Search, Bookmarks
- `artifacts/quran-app/src/hooks/use-quran.ts` — data layer (useChapters, useSurah, useSearch)
- `artifacts/quran-app/src/hooks/use-bookmarks.ts` — localStorage bookmark hook
- `artifacts/quran-app/src/components/AudioPlayer.tsx` — per-ayah audio button
- `artifacts/quran-app/src/components/Layout.tsx` — nav + theme wrapper

## Architecture decisions

- **Frontend-only**: All Quran data comes from the `quran-json` npm package (static JSON). No backend or database needed.
- **Global ayah IDs**: Each verse has a `globalId` (1–6236) computed from known per-surah verse counts. This ID maps directly to the Al-Quran Cloud audio CDN path.
- **Dynamic imports**: Surah data is lazy-loaded per surah (`import('quran-json/dist/chapters/en/${id}.json')`). Vite emits warnings but handles these correctly at runtime.
- **Audio lifecycle**: `AudioPlayer` tears down and recreates the `Audio` element on every `ayahId` change to prevent stale-src bugs.

## Product

- Browse all 114 Surahs with Arabic name, transliteration, translation, and Meccan/Medinan badge
- Read any Surah with full Arabic text (Amiri font), English translation, and transliteration
- Listen to recitation per ayah (Mishary Rashid Alafasy) with auto-advance
- Search across all English translations with keyword highlighting
- Bookmark verses, persisted to localStorage

## User preferences

_Populate as you build._

## Gotchas

- Vite warns about unanalyzable dynamic imports from `quran-json/dist/chapters/en/` — these are expected and work correctly at runtime. Suppress with `/* @vite-ignore */`.
- Audio URLs use the global ayah ID (1–6236), not the local verse number within a surah.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-file, no-build PWA that provides 17 browser-side PDF tools (convert, merge, split, encrypt, compress, reorder, sign, watermark, etc.). All processing happens locally in the browser — no server uploads. Deployed as a static site on Vercel.

## No build / no tests

There is no `package.json`, no build step, and no test suite. The entire app is a static HTML file served directly. To preview changes, open `index.html` in a browser or run a local static server.

## Architecture

### Single-file SPA (`index.html`)

The entire application — HTML, CSS (Tailwind + custom `<style>`), and JavaScript — lives in one file. The JS is embedded in a single `<script>` block at the end of `<body>`. There are no modules, no imports, no components.

### Feature mode system (line ~507)

All tools are registered in the `FEATURE_MODES` object. Each mode defines:

| Field | Purpose |
|---|---|
| `id` | Unique mode key (e.g. `pdf2img`, `merge`) |
| `accept` | File input accept filter (`.pdf`, `.jpg,.jpeg,.png,.webp`) |
| `multiple` | Whether multi-file selection is allowed |
| `settingsPanel` | ID of the `<div>` containing this mode's settings UI |
| `action` | Name of the global function to call when the user clicks the action button |

`window.selectMode(modeId)` swaps modes: it hides all `[id^="settings"]` panels, shows the selected one, rebinds `actionBtn.onclick`, and resets file state.

### Global functions as entry points

Every mode's action is a global function (`window.startConversion`, `window.startMerge`, etc.). There are no classes or state management — all state is in module-scoped `let` variables (`currentMode`, `selectedFiles`, `finalZipBlob`).

### CDN libraries (lines 11-22)

- **Tailwind CSS** (cdn.tailwindcss.com) — utility CSS, dark mode via `class` strategy
- **PDF.js 3.11.174** — PDF rendering to `<canvas>`
- **JSZip 3.10.1** — bundling output files into ZIP
- **pdf-lib 1.17.1** — PDF manipulation (merge, split, rotate, encrypt, metadata, reorder)
- **docx 8.5.0** — generating .docx for PDF-to-Word conversion

### i18n (lines 678-743)

Two locales (`zh`, `en`) stored in a `translations` object. UI text is applied via `data-i18n` attributes matching keys. `window.changeLanguage(lang)` iterates `[data-i18n]` elements and swaps text. Language preference is persisted in `localStorage.app_lang`.

### Theme (lines 657-675)

Dark/light toggled by adding/removing `class="dark"` on `<html>`. Tailwind's `dark:` variants handle the rest. Persisted in `localStorage.app_theme`.

### PWA (`sw.js`, `manifest.json`)

Service worker caches the app shell and CDN scripts for offline use. The manifest enables "Add to Home Screen" with standalone display mode.

### Vercel deployment

- `vercel.json` — Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, no-cache for `sw.js`
- `.vercel/project.json` — Linked to Vercel project `pdf-toolbox` (org: `team_qkR7xRhDsOKKnwHFmw9J67LM`)
- `.gitignore` — Ignores `.vercel` directory

## Key patterns when editing

- **All JS is global scope.** Functions assigned to `window.*` are called from inline `onclick` handlers. Keep new action functions global and register them in `FEATURE_MODES`.
- **Settings panels use `hidden` class** (Tailwind's `display: none`). Toggle visibility via `classList.toggle('hidden', condition)`.
- **i18n is manual.** When adding new UI strings, add entries to both `zh` and `en` in the `translations` object, and use `data-i18n="keyName"` on the element.
- **No module system.** CDN libraries attach to `window` (e.g., `pdfjsLib`, `JSZip`, `PDFLib`, `docx`). Do not use `import`/`export`.
- **File processing is async but sequential.** Use `await` liberally; the code already includes a `yieldThread()` helper (line 994) to yield to the browser between heavy operations.
- **The `title` tag says "YouTube Title Studio"** — this is intentional branding, not a bug.

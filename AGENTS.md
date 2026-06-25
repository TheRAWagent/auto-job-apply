# AGENTS.md

Guidelines for working in this repository.

## Project Overview

This is **Auto Job Apply**, a browser extension (Chrome Manifest V3) built as a React popup UI. It is a Vite + React 19 + TypeScript project styled with Tailwind CSS v4 and shadcn/ui.

- **Runtime target**: Chrome extension popup (`public/manifest.json`)
- **Build target**: Static `dist/` folder loaded as an unpacked extension
- **Package manager**: Bun (`bun.lock`)
- **No tests configured yet**.

## Essential Commands

All commands use Bun:

```bash
bun install     # Install dependencies
bun run dev     # Start Vite dev server
bun run build   # Type-check with tsc then build production bundle to dist/
bun run lint    # Run ESLint on the project
bun run preview # Preview the production build locally
```

> Do not use `npm` or `yarn` unless you have a specific reason; the repo tracks `bun.lock`.

## Project Structure

```
public/           # Static assets copied into dist/
  manifest.json   # Chrome extension manifest (entry point for the browser)
  logo-*.png      # Extension icons referenced by manifest.json
  logo.svg
src/
  App.tsx         # Root popup component
  App.css         # Legacy component styles (mostly unused boilerplate)
  main.tsx        # React root mount (StrictMode enabled)
  index.css       # Tailwind v4 imports, theme tokens, base styles
  lib/
    utils.ts      # `cn()` helper for clsx + tailwind-merge
  components/     # (shadcn/ui components go here; currently empty)
index.html        # Popup HTML; Vite entry for the dev server
vite.config.ts    # Vite + React Compiler + Tailwind CSS plugin
components.json   # shadcn/ui configuration
```

## Architecture and Control Flow

- The extension is a **single-page popup**: `index.html` loads `src/main.tsx`, which renders `App.tsx` into `#root`.
- There are currently **no content scripts, background/service workers, or side panels**. The manifest declares only `action.default_popup`.
- Chrome APIs are available in the popup via `chrome.*` because the popup runs in an extension context. The manifest already requests `activeTab`, `scripting`, and `storage` permissions plus `host_permissions: ["<all_urls>"]`.
- The React Compiler is enabled as a Babel pass (`babel({ presets: [reactCompilerPreset()] })` in `vite.config.ts`). You generally do not need to write manual `useMemo`/`useCallback` unless the compiler cannot optimize a case.
- StrictMode is enabled in `main.tsx`, so components will render twice in development.

## Build Output

- `bun run build` produces a loadable unpacked extension in `dist/`.
- `dist/manifest.json` is copied from `public/manifest.json`.
- To test the extension locally, open `chrome://extensions`, enable Developer mode, and load `dist/` as an unpacked extension.
- `dist/` is ignored by Git; do not commit it.

## Code Conventions

### TypeScript

- Path alias `@/*` resolves to `./src/*`. Example: `import { cn } from "@/lib/utils"`.
- `tsconfig.app.json` applies to `src/`; `tsconfig.node.json` applies to `vite.config.ts`.
- The project uses TypeScript 6 and React 19 JSX transform (`jsx: "react-jsx"`).
- `verbatimModuleSyntax: true`: use `import type { ... }` for type-only imports.
- Unused locals and parameters are errors (`noUnusedLocals`, `noUnusedParameters`).

### Styling

- Tailwind CSS v4 is configured via the Vite plugin (`@tailwindcss/vite`). There is no `tailwind.config.js`.
- Theme tokens live in `src/index.css` using CSS variables and `@theme inline`.
- The shadcn base color is `olive` and the style is `radix-nova`.
- Always use the `cn()` helper from `@/lib/utils` when composing conditional classes.
- Dark mode is available via the `.dark` class; the color tokens are defined in `src/index.css`.

### shadcn/ui

- shadcn/ui is set up with aliases in `components.json`:
  - Components: `@/components`
  - UI primitives: `@/components/ui`
  - Utilities: `@/lib/utils`
  - Hooks: `@/hooks`
- The icon library is `lucide-react`.
- No components are installed yet; use the shadcn CLI (via `npx shadcn@latest add <component>` or `bunx shadcn@latest add <component>`) if you add them.

### Linting

- ESLint config is in `eslint.config.js` (flat config).
- Extends `@eslint/js/recommended`, `typescript-eslint/recommended`, `react-hooks/recommended`, and `react-refresh/vite`.
- Globals are set to `globals.browser`.
- `dist/` is ignored.

## Important Gotchas

- **Chrome extension context**: Code in the popup can use `chrome.*` APIs, but it does not have direct access to the page DOM. To interact with web pages, inject a content script (not yet present) via `chrome.scripting.executeScript`.
- **No service worker**: The manifest does not declare a `background` service worker. If you add one, create it under `public/` or `src/` and update `vite.config.ts` and `manifest.json` accordingly.
- **React Compiler overhead**: The compiler is enabled in dev and production. This can slow down the Vite dev server and builds.
- **Import extensions**: `allowImportingTsExtensions: true` lets you import `.tsx`/`.ts` files with their extension (e.g., `import App from './App.tsx'`). Keep imports consistent with the existing style.
- **Font loading**: The Inter variable font is imported in `src/index.css` via `@fontsource-variable/inter`; no additional `<link>` is needed.
- **Bun-only lockfile**: Because `bun.lock` is present, running `npm install` will generate a different lockfile. Prefer `bun install`.
- **No tests**: There is no test runner or test scripts. If you add tests, choose a runner compatible with React 19 (e.g., Vitest + React Testing Library or Playwright for extension E2E).

## Adding New Extension Features

- **Popup UI**: Add components under `src/` and render them from `App.tsx`.
- **Content scripts**: Create the script in `src/` (or `public/`), add it to `manifest.json` under `content_scripts`, and ensure Vite bundles it if it uses modules.
- **Background/service worker**: Add `background.service_worker` to `manifest.json` and point it to the bundled output.
- **Chrome storage**: The `storage` permission is already declared. Use `chrome.storage.local` or `chrome.storage.sync` for persistence.
- **Permissions**: Adding new permissions requires updating `public/manifest.json`; remember the build copies it verbatim to `dist/`.

## Useful References

- `package.json`: scripts and dependencies
- `public/manifest.json`: extension metadata and permissions
- `vite.config.ts`: build pipeline (React Compiler, Tailwind v4)
- `components.json`: shadcn/ui registry configuration
- `src/index.css`: design tokens and Tailwind v4 theme

# Klik

Klik is a free, open-source (MIT) Windows screenshot tool made by Real Time Project Management. Its promise: fewer clicks, only what you need, and it does that really well. A change succeeds when it removes clicks or friction; it fails when it adds buttons, dialogs or settings the user did not ask for.

## What binds, and why

- **Fewer clicks beats more features.** That is the product. The click budget in `docs/SPEC.md` section 4 is the test, and a new button or dialog needs a stated reason in its pull request.
- **One app.** Capture, editor and every later window (Studio, step capture, video) live in `app/`. Copies of the app drifted apart within a day once, so extend this app instead of forking it.
- **Local by default.** Nothing leaves the PC unless the user starts it. The README promises this.
- **RTPM product brand for the UI.** Inter only; light surfaces; Primary Indigo `#0d08d2` for the active state; one Accent Yellow `#ffcc00` primary action per screen; marking colours red `#C0392B`, indigo, green `#27AE60`, yellow, ink `#15162b`; sentence case; no em-dashes. The tokens live in `app/src/styles.css`. Source: RTPM's internal brand system (038-KNW); ask Henning before changing a token. Studio's slides use the RTPM content brand instead, with their own tokens in `app/src/studio/render.ts`; keep the two apart.
- **Two languages, few words.** UI text goes in `app/src/i18n.ts` (frontend) and `danish()` in `app/src-tauri/src/lib.rs` (tray), English plus Danish. Code, comments and docs are in English.

Everything else is a default you may change, saying why.

## How the work runs

- One feature per branch and pull request into `main`. One session builds at a time, so work never overwrites itself.
- Update `docs/SPEC.md` (status: Built, Planned, Open) and `ROADMAP.md` in the same pull request as the code.
- Cloud sessions have no Windows:
  - Editor: `cd app && npm run build && npx vite preview`, then drive it with Playwright. `bridge.ts` serves a demo desktop outside Tauri.
  - Rust: `cargo check --target x86_64-pc-windows-msvc` in `app/src-tauri` (needs a stub file at `app/src-tauri/binaries/klik-mcp-x86_64-pc-windows-msvc.exe`), and `cargo test` in `mcp`.
  - The Windows installer is built by `.github/workflows/build.yml` on every push.
- Release: bump the version in `app/package.json`, `app/src-tauri/tauri.conf.json` and `app/src-tauri/Cargo.toml`, merge, then run the Build workflow by hand on `main` with `release` = `X.Y.Z` (cloud sessions cannot push tags; a `vX.Y.Z` tag works too). The build publishes a GitHub Release with `Klik-setup.exe` (the README download link) and `Klik.mcpb`.

## Where things are

- `app/src/`: editor (`Overlay.tsx`), shapes and export (`draw.ts`), Tauri calls and demo desktop (`bridge.ts`), texts (`i18n.ts`).
- `app/src/studio/`: Klik Studio window (`Studio.tsx`), slide drawing and brand checks (`render.ts`, RTPM content brand tokens), PDF/PNG export, file access (`io.ts`).
- `app/src-tauri/src/lib.rs`: hotkey, capture of the monitor under the mouse, clipboard and file, tray menu, and Studio's file access (read captures and drafts, write exports).
- `mcp/`: the MCP server Claude uses (`store.rs` holds the tested file logic).
- `docs/SPEC.md`: what Klik should do, with pass tests. `ROADMAP.md`: what comes next.

## Done looks like

- The changed flow is tested in the browser and a screenshot of it checked; `cargo test` passes; the Windows build is green.
- The report says plainly what is built, what is browser-tested and what is untested on Windows. Henning tests on his PC.

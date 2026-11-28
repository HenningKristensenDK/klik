// Talks to the Rust core. In a plain browser (dev/test) it uses a demo image.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const inTauri = "__TAURI_INTERNALS__" in window;

export type Shot = { bitmap: ImageBitmap; w: number; h: number };

/** Width, height (u32 LE) + RGBA, as the core sends images. */
async function parseShot(buf: ArrayBuffer): Promise<Shot> {
  const dv = new DataView(buf);
  const w = dv.getUint32(0, true);
  const h = dv.getUint32(4, true);
  const data = new ImageData(new Uint8ClampedArray(buf, 8, w * h * 4), w, h);
  return { bitmap: await createImageBitmap(data), w, h };
}

export async function loadShot(): Promise<Shot> {
  if (!inTauri) {
    if (demoEdit() === "long") {
      const c = demoLongPage();
      return { bitmap: c.transferToImageBitmap(), w: DEMO_LONG.w, h: DEMO_LONG.h };
    }
    return demoShot();
  }
  return parseShot(await invoke<ArrayBuffer>("get_shot"));
}

// ---------- Long screenshot ----------
// The wheel on a selected area: the core passes each step to the window
// below, grabs the area and stitches the grabs. In a plain browser a demo
// page scrolls instead.

export type Area = { x: number; y: number; w: number; h: number };

/** Starts a long screenshot of `area` (image pixels). */
export async function longStart(area: Area): Promise<void> {
  const r = { x: Math.round(area.x), y: Math.round(area.y), w: Math.max(1, Math.round(area.w)), h: Math.max(1, Math.round(area.h)) };
  if (!inTauri) return demo.start(r);
  await invoke("long_start", r);
}

/** `notches` wheel steps down. */
export function longStep(notches: number) {
  if (!inTauri) return demo.step(notches);
  invoke("long_step", { notches });
}

/** The long image grew; `height` is its height so far in image pixels. */
export function onLongProgress(cb: (height: number) => void): () => void {
  if (!inTauri) {
    demo.listeners.add(cb);
    return () => demo.listeners.delete(cb);
  }
  let off = () => {};
  let gone = false;
  listen<number>("long-progress", (e) => cb(e.payload)).then((u) => (gone ? u() : (off = u)));
  return () => {
    gone = true;
    off();
  };
}

/** The area as it is now, for the live view. */
export async function longFrame(): Promise<Shot> {
  if (!inTauri) return demo.frame();
  return parseShot(await invoke<ArrayBuffer>("long_frame"));
}

/** Ends the long screenshot; the tall image is the capture from now on. */
export async function longFinish(): Promise<Shot> {
  if (!inTauri) return demo.finish();
  return parseShot(await invoke<ArrayBuffer>("long_finish"));
}

/** A tall demo page that "scrolls" under the selected area. */
const demo = {
  page: null as OffscreenCanvas | null,
  area: { x: 0, y: 0, w: 1, h: 1 } as Area,
  offset: 0,
  listeners: new Set<(height: number) => void>(),
  start(area: Area) {
    this.area = area;
    this.offset = 0;
    this.page = demoPage(area.w, Math.min(area.h * 5, 16000));
  },
  step(n: number) {
    const page = this.page;
    if (!page) return;
    const dpr = window.devicePixelRatio || 1;
    this.offset = Math.min(this.offset + Math.round(n * 100 * dpr), page.height - this.area.h);
    const height = this.offset + this.area.h;
    window.setTimeout(() => this.listeners.forEach((cb) => cb(height)), 120);
  },
  async frame(): Promise<Shot> {
    const { w, h } = this.area;
    return { bitmap: await createImageBitmap(this.page!, 0, this.offset, w, h), w, h };
  },
  async finish(): Promise<Shot> {
    const w = this.area.w;
    const h = this.offset + this.area.h;
    const bitmap = await createImageBitmap(this.page!, 0, 0, w, h);
    this.page = null;
    return { bitmap, w, h };
  },
};

/** A long project list, drawn at the screen's pixel ratio. */
function demoPage(w: number, h: number): OffscreenCanvas {
  const dpr = window.devicePixelRatio || 1;
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const W = w / dpr;
  const H = h / dpr;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#0d08d2";
  g.fillRect(0, 0, W, 44);
  g.fillStyle = "#ffffff";
  g.font = "600 15px Inter, Segoe UI, system-ui, sans-serif";
  g.fillText("Aktiviteter - Vindmøllepark Nord", 16, 28);
  const rowH = 34;
  for (let i = 0, y = 44; y < H; i++, y += rowH) {
    g.fillStyle = i % 2 ? "#f4f4fb" : "#ffffff";
    g.fillRect(0, y, W, rowH);
    g.fillStyle = "#15162b";
    g.font = "14px Inter, Segoe UI, system-ui, sans-serif";
    g.fillText(`${i + 1}. Fundament ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`, 16, y + 22);
    const done = (i * 37) % 100;
    g.fillStyle = "#e6e6f0";
    g.fillRect(W - 180, y + 12, 120, 10);
    g.fillStyle = done > 70 ? "#27AE60" : done > 30 ? "#ffcc00" : "#C0392B";
    g.fillRect(W - 180, y + 12, (120 * done) / 100, 10);
    g.fillStyle = "#595b78";
    g.fillText(`${done} %`, W - 50, y + 22);
  }
  return c;
}

/**
 * Where a reopened screenshot sits: x, y, w, h in image pixels. A fifth value
 * of 1 means it is larger than the screen and opens as is, in tall mode.
 */
export type Preselect = [number, number, number, number] | [number, number, number, number, number] | null;

/** The long screenshot from the 1.0 bug report, for the browser demo. */
export const DEMO_LONG = { name: "Klik demo long.png", w: 1114, h: 12441 };

/** `?edit` reopens the demo desktop; `?edit=long` reopens the long demo screenshot. */
function demoEdit(): "" | "plain" | "long" {
  const q = new URLSearchParams(location.search);
  if (!q.has("edit")) return "";
  return q.get("edit") === "long" ? "long" : "plain";
}

/**
 * A new capture, or a saved screenshot reopened from the gallery or Studio
 * (then `sel` says where it is, already selected). In a plain browser, `?edit`
 * and `?edit=long` simulate the latter.
 */
export function onCaptured(cb: (sel: Preselect) => void): () => void {
  if (!inTauri) {
    const e = demoEdit();
    cb(e === "long" ? [0, 0, DEMO_LONG.w, DEMO_LONG.h, 1] : e === "plain" ? [160, 120, 480, 300] : null);
    return () => {};
  }
  let off = () => {};
  listen<Preselect>("captured", (e) => cb(e.payload ?? null)).then((u) => {
    off = u;
    // Tell the core we listen; a pending "open Klik = screenshot" fires now.
    invoke("frontend_ready");
  });
  return () => off();
}

/** Esc pressed while the editor is open, caught by the core even when the editor lacks focus. */
export function onEscape(cb: () => void): () => void {
  if (!inTauri) return () => {};
  let off = () => {};
  let gone = false;
  listen("escape", () => cb()).then((u) => (gone ? u() : (off = u)));
  return () => {
    gone = true;
    off();
  };
}

/** The hotkey Klik got (e.g. "Ctrl+Alt+K"), or null if all were taken. */
export const hotkeyLabel = (): Promise<string | null> =>
  inTauri ? invoke<string | null>("hotkey_label") : Promise.resolve("Ctrl+Alt+K");

export const showOverlay = () => (inTauri ? invoke("show_overlay") : Promise.resolve());
/** Hide the overlay. `discard` deletes the file saved for this capture. */
export const close = (discard: boolean) => (inTauri ? invoke("close", { discard }) : Promise.resolve());

/** Hide the overlay and add the saved screenshot as a slide in Klik Studio. */
export const closeToStudio = () => (inTauri ? invoke("close_to_studio") : Promise.resolve());

/** Hide the overlay (the screenshot is already saved) and open the gallery. */
export const closeToGallery = () => (inTauri ? invoke("close_to_gallery") : Promise.resolve());

/** Whether Windows lets Klik ask to be pinned to the taskbar, and whether it is. */
export type PinState = { allowed: boolean; pinned: boolean };
let demoPinned = false;
export const pinState = (): Promise<PinState> =>
  inTauri ? invoke<PinState>("pin_state") : Promise.resolve({ allowed: true, pinned: demoPinned });
/** Ask Windows to show its "Pin to taskbar?" prompt. */
export const requestPin = (): Promise<unknown> => {
  if (inTauri) return invoke("request_pin");
  demoPinned = true;
  return Promise.resolve();
};

/** Copy to the clipboard and save to Pictures\Klik. `rgba` = width, height (u32 LE) + RGBA pixels. */
export async function saveCopy(rgba: Uint8Array): Promise<string> {
  if (inTauri) return invoke<string>("save_copy", rgba);
  const w = window as unknown as { __lastPng?: Uint8Array; __saves?: number };
  w.__lastPng = rgba;
  w.__saves = (w.__saves ?? 0) + 1;
  return "demo.png";
}

/** A fake desktop so the editor can be developed and tested in a browser. */
async function demoShot(): Promise<Shot> {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1e3a5f");
  bg.addColorStop(1, "#0f766e");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // a window
  g.fillStyle = "#ffffff";
  g.fillRect(120, 90, 720, 460);
  g.fillStyle = "#f1f5f9";
  g.fillRect(120, 90, 720, 36);
  g.fillStyle = "#0f172a";
  g.font = "600 15px Segoe UI, system-ui, sans-serif";
  g.fillText("Projektstatus - Vindmøllepark Nord", 140, 113);
  g.font = "14px Segoe UI, system-ui, sans-serif";
  const rows = ["Fundament: 42 af 60 færdige", "Tårne leveret: 18", "Næste milepæl: 1. december", "Risici åbne: 7", "Budget forbrugt: 61 %"];
  rows.forEach((r, i) => g.fillText(r, 150, 170 + i * 34));
  g.fillStyle = "#2563eb";
  g.fillRect(150, 360, 140, 38);
  g.fillStyle = "#fff";
  g.fillText("Godkend", 190, 384);
  g.fillStyle = "rgba(15,23,42,0.85)";
  g.fillRect(0, H - 48, W, 48);
  return { bitmap: c.transferToImageBitmap(), w, h };
}

/** A long product page, 1114 x 12441, like a long screenshot saved by Klik. Sample data. */
export function demoLongPage(): OffscreenCanvas {
  const { w, h } = DEMO_LONG;
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  g.fillStyle = "#F7F7FB";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#070474";
  g.fillRect(0, 0, w, 120);
  g.fillStyle = "#FFFFFF";
  g.font = "700 40px Inter, sans-serif";
  g.fillText("Interface register (sample data)", 48, 76);
  for (let y = 160, i = 1; y < h - 120; y += 96, i++) {
    if (i % 25 === 1) {
      g.fillStyle = "#0D08D2";
      g.font = "600 30px Inter, sans-serif";
      g.fillText(`Section ${Math.ceil(i / 25)}`, 48, y + 52);
      continue;
    }
    g.fillStyle = i % 2 ? "#FFFFFF" : "#FAFAFD";
    g.fillRect(48, y, w - 96, 84);
    g.fillStyle = "#15162B";
    g.font = "400 26px Inter, sans-serif";
    g.fillText(`IF-${String(i).padStart(4, "0")}  Cable entry detail  Owner: Contractor ${i % 3 ? "A" : "B"}`, 72, y + 52);
  }
  g.fillStyle = "#C0392B";
  g.fillRect(0, h - 120, w, 120);
  g.fillStyle = "#FFFFFF";
  g.font = "700 36px Inter, sans-serif";
  g.fillText("End of page", 48, h - 48);
  return c;
}

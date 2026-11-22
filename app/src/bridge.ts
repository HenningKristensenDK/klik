// Talks to the Rust core. In a plain browser (dev/test) it uses a demo image.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const inTauri = "__TAURI_INTERNALS__" in window;

export type Shot = { bitmap: ImageBitmap; w: number; h: number };

export async function loadShot(): Promise<Shot> {
  if (!inTauri) return demoShot();
  const buf = await invoke<ArrayBuffer>("get_shot");
  const dv = new DataView(buf);
  const w = dv.getUint32(0, true);
  const h = dv.getUint32(4, true);
  const data = new ImageData(new Uint8ClampedArray(buf, 8, w * h * 4), w, h);
  return { bitmap: await createImageBitmap(data), w, h };
}

/** Where a reopened screenshot sits on the backdrop: x, y, w, h in image pixels. */
export type Preselect = [number, number, number, number] | null;

/**
 * A new capture, or a saved screenshot reopened from Studio (then `sel` says
 * where it is, already selected). In a plain browser, `?edit` simulates the latter.
 */
export function onCaptured(cb: (sel: Preselect) => void): () => void {
  if (!inTauri) {
    cb(new URLSearchParams(location.search).has("edit") ? [160, 120, 480, 300] : null);
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

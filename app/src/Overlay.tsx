import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  close,
  closeToGallery,
  closeToStudio,
  hotkeyLabel,
  inTauri,
  loadShot,
  longFinish,
  longFrame,
  longStart,
  longStep,
  onCaptured,
  onEscape,
  onLongProgress,
  saveCopy,
  showOverlay,
  type Shot,
} from "./bridge";
import { CALLOUT, DIM, TEXT, TEXT_FONT, calloutLayout, hitShape, moveShape, renumber, resizeText, shapeFrame, textInk, textLayout, exportRgba, normRect, render, type Pt, type Rect, type Shape, type Tool } from "./draw";
import { Icon } from "./icons";
import { t } from "./i18n";
import { VERSION } from "./version";
import { STUDIO } from "./flags";

/** `long`: the wheel is making a long screenshot of the selected area. */
type Mode = "idle" | "select" | "edit" | "long";

// RTPM brand system colours (1.1, Henning 2026.11.28): Ink Navy, red, Primary
// Indigo, green, gold. Navy replaced black.
const COLORS = ["#070474", "#E63946", "#0D08D2", "#28A745", "#FFCC00"];
const DEFAULT_COLORS: Record<Tool, string> = {
  highlight: "#FFCC00",
  pen: "#E63946",
  line: "#E63946",
  arrow: "#0D08D2",
  callout: "#0D08D2",
  text: "#070474",
};
/** How long Done reads "Copied" after a save, ms. */
const FLASH_MS = 1400;
/** One Undo step: the markings and the frame, so a crop can be undone too. */
type Past = { shapes: Shape[]; sel: Rect | null };
const remember = (s: { past: Past[]; shapes: Shape[]; sel: Rect | null }) => s.past.push({ shapes: s.shapes, sel: s.sel });

/** Crop handles on the frame: corners and middles of each edge. */
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];
const CURSOR: Record<Handle, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
/** Smallest frame a crop leaves, image pixels. */
const MIN_CROP = 16;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const TOOLS: { id: Tool; key: string; label: string }[] = [
  { id: "highlight", key: "M", label: t.highlight },
  { id: "arrow", key: "A", label: t.arrow },
  { id: "callout", key: "K", label: t.callout },
  { id: "pen", key: "P", label: t.pen },
  { id: "line", key: "L", label: t.line },
  { id: "text", key: "T", label: t.textBox },
];

export function Overlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shot = useRef<Shot | null>(null);
  const st = useRef({
    mode: "idle" as Mode,
    sel: null as Rect | null,
    shapes: [] as Shape[],
    draft: null as Shape | null,
    start: null as Pt | null,
    tool: "highlight" as Tool,
    colors: { ...DEFAULT_COLORS },
    busy: false,
    toast: "",
    /** Index of the comment being typed, or null. */
    editing: null as number | null,
    /** Clipboard state shown in the toolbar. */
    status: "" as "" | "saving" | "saved" | "error",
    /** A screenshot reopened from Studio: the wheel does not start a long one. */
    reopened: false,
    /** The capture is a long screenshot, taller than the screen: the page scrolls. */
    tall: false,
    /** Height of the long screenshot so far, image pixels. */
    longH: 0,
    /** Wheel movement not yet turned into notches. */
    wheelAcc: 0,
    /** The marking picked with a click: drag moves it, Del or its x deletes it. */
    picked: null as number | null,
    /** A picked marking being dragged. */
    drag: null as { i: number; from: Pt; orig: Shape; moved: boolean } | null,
    /** Earlier markings and frames, for Undo. */
    past: [] as Past[],
    /** The scroll watermark is gone: a tool, a crop or a marking came first. */
    hintGone: false,
    /** A reopened screenshot: crops stay inside the saved image. */
    bounds: null as Rect | null,
    /** A crop handle being dragged. */
    crop: null as { h: Handle; from: Pt; orig: Rect; moved: boolean } | null,
    /** The corner of a picked text box being dragged to resize it. */
    resize: null as { i: number; from: Pt; orig: Extract<Shape, { kind: "text" }>; moved: boolean } | null,
    /** Done reads "Copied" until this time, so people see it is already on the clipboard. */
    flashUntil: 0,
  });
  const flashTimer = useRef<number | undefined>(undefined);
  /** The area as it is now, while a long screenshot runs. */
  const live = useRef<ImageBitmap | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const saveSeq = useRef(0);
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const hotkey = useRef<string | null>(null);
  const frame = useRef(0);

  /**
   * Image pixels per CSS pixel. In tall mode the image is shown at the scale it
   * was taken at, so this is known before the browser lays the page out; a
   * freshly reopened long screenshot would otherwise measure the old size.
   */
  const k = () => {
    const c = canvasRef.current;
    if (!c || !shot.current) return 1;
    if (st.current.tall) return window.devicePixelRatio || 1;
    return shot.current.w / c.getBoundingClientRect().width;
  };

  const paint = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const c = canvasRef.current;
      const s = st.current;
      if (!c || !shot.current) return;
      const shapes = s.draft ? [...s.shapes, s.draft] : s.shapes;
      render(c.getContext("2d")!, shot.current.bitmap, s.sel, shapes, k(), s.editing, s.mode === "long" ? live.current : null, s.mode === "select" ? DIM.picking : DIM.framed, s.picked, t.writeText);
    });
  }, []);

  // A new capture arrives: draw it first, then show the window.
  useEffect(
    () =>
      onCaptured(async (pre) => {
        const next = await loadShot();
        hotkey.current = await hotkeyLabel();
        shot.current?.bitmap.close();
        shot.current = next;
        const c = canvasRef.current!;
        c.width = next.w;
        c.height = next.h;
        // A screenshot reopened from the gallery arrives already selected, ready
        // to mark. One larger than the screen opens as is, in tall mode.
        const sel = pre ? { x: pre[0], y: pre[1], w: pre[2], h: pre[3] } : null;
        const tall = pre?.[4] === 1;
        live.current?.close();
        live.current = null;
        Object.assign(st.current, {
          mode: sel ? "edit" : "select",
          sel,
          shapes: [],
          draft: null,
          start: null,
          busy: false,
          toast: "",
          status: "",
          editing: null,
          reopened: !!sel,
          picked: null,
          drag: null,
          past: [],
          tall,
          longH: 0,
          wheelAcc: 0,
          hintGone: false,
          crop: null,
          resize: null,
          flashUntil: 0,
          bounds: sel,
        });
        render(c.getContext("2d")!, next.bitmap, sel, [], k(), null, null, sel ? DIM.framed : DIM.picking);
        rerender();
        await showOverlay();
      }),
    [],
  );

  const toImg = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    const kk = k();
    return { x: (e.clientX - r.left) * kk, y: (e.clientY - r.top) * kk };
  };

  /** Save + copy what is on screen now. Only the newest save counts. */
  const saveNow = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    const s = st.current;
    if (!s.sel || !shot.current) return;
    const my = ++saveSeq.current;
    const png = exportRgba(shot.current.bitmap, s.sel, s.shapes, k());
    s.status = "saving";
    rerender();
    saving.current = saving.current
      .then(() => saveCopy(png))
      .then(
        () => {
          if (my !== saveSeq.current) return;
          s.status = "saved";
          s.flashUntil = Date.now() + FLASH_MS;
          window.clearTimeout(flashTimer.current);
          flashTimer.current = window.setTimeout(rerender, FLASH_MS + 20);
        },
        () => (s.status = "error"),
      )
      .then(rerender);
    await saving.current;
  }, []);

  /** Debounced: lets quick strokes in a row cost only one save. */
  const scheduleSave = useCallback(
    (delay = 150) => {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(saveNow, delay);
    },
    [saveNow],
  );

  /** Finish typing a comment or text box. An empty one is removed. */
  const commitText = useCallback(() => {
    const s = st.current;
    if (s.editing === null) return;
    const sh = s.shapes[s.editing];
    if (sh?.kind === "callout" || sh?.kind === "text") {
      const text = sh.kind === "text" ? sh.text.replace(/\s+$/, "") : sh.text.trim();
      s.shapes = text
        ? s.shapes.map((x, i) => (i === s.editing ? { ...sh, text } : x))
        : s.shapes.filter((_, i) => i !== s.editing);
    }
    s.editing = null;
    paint();
    rerender();
    scheduleSave();
  }, [paint, scheduleSave]);

  /**
   * Esc / Enter / Færdig: everything is already copied; make sure the last
   * change is too, then close. With `studio`, the saved file also becomes a
   * slide in Klik Studio, which opens.
   */
  const finish = useCallback(
    async (studio: boolean) => {
      const s = st.current;
      if (s.busy || !s.sel || !shot.current) return;
      if (s.editing !== null) commitText();
      s.busy = true;
      if (saveTimer.current !== undefined) await saveNow();
      await saving.current;
      s.mode = "idle";
      s.toast = studio ? t.toastStudio : t.toast;
      rerender();
      await (studio ? closeToStudio() : close(false));
      s.busy = false;
    },
    [saveNow, commitText],
  );
  const done = useCallback(() => finish(false), [finish]);
  const toStudio = useCallback(() => finish(true), [finish]);
  /** The gallery button or `G`: the image is saved, so close and show the gallery. */
  const toGallery = useCallback(async () => {
    const s = st.current;
    if (s.busy || !s.sel || !shot.current) return;
    if (s.editing !== null) commitText();
    s.busy = true;
    if (saveTimer.current !== undefined) await saveNow();
    await saving.current;
    s.mode = "idle";
    rerender();
    await closeToGallery();
    s.busy = false;
  }, [saveNow, commitText]);

  /**
   * Ends a long screenshot. The tall image replaces the capture and is copied
   * and saved at once. `save` then closes, as Esc does on a normal capture;
   * `edit` keeps the editor open to draw on it; `studio` sends it to Studio.
   */
  const finishLong = useCallback(
    async (next: "save" | "edit" | "studio") => {
      const s = st.current;
      if (s.mode !== "long" || s.busy) return;
      s.busy = true;
      let tall: Shot;
      try {
        tall = await longFinish();
      } catch (e) {
        console.error("klik: long screenshot failed", e);
        Object.assign(s, { mode: "edit", busy: false });
        paint();
        rerender();
        return;
      }
      live.current?.close();
      live.current = null;
      shot.current?.bitmap.close();
      shot.current = tall;
      const c = canvasRef.current!;
      c.width = tall.w;
      c.height = tall.h;
      Object.assign(s, { mode: "edit", tall: true, sel: { x: 0, y: 0, w: tall.w, h: tall.h }, shapes: [], draft: null, busy: false, past: [] });
      rerender();
      paint();
      scheduleSave(0);
      if (next === "save") await done();
      else if (next === "studio") await toStudio();
    },
    [paint, scheduleSave, done, toStudio],
  );

  /** The first wheel notch on a selected area starts a long screenshot. */
  const startLong = useCallback(
    async (notches: number) => {
      const s = st.current;
      if (!s.sel) return;
      s.busy = true;
      try {
        await longStart(s.sel);
      } catch (e) {
        console.error("klik: long screenshot could not start", e);
        s.busy = false;
        return;
      }
      Object.assign(s, { mode: "long", longH: Math.round(s.sel.h), busy: false });
      paint();
      rerender();
      longStep(notches);
    },
    [paint],
  );

  const onWheel = (e: React.WheelEvent) => {
    const s = st.current;
    if (s.busy || s.tall || s.reopened || e.deltaY <= 0) return; // down only
    const canStart = s.mode === "edit" && !s.shapes.length && s.editing === null && !s.draft;
    if (s.mode !== "long" && !canStart) return;
    s.wheelAcc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
    const n = Math.floor(s.wheelAcc / 100);
    if (n < 1) return;
    s.wheelAcc -= n * 100;
    if (s.mode === "long") longStep(n);
    else startLong(n);
  };

  // The long screenshot grew: show the area as it is now.
  useEffect(
    () =>
      onLongProgress(async (height) => {
        const s = st.current;
        if (s.mode !== "long") return;
        s.longH = height;
        const f = await longFrame().catch(() => null);
        if (!f) return;
        if (st.current.mode !== "long") return f.bitmap.close();
        live.current?.close();
        live.current = f.bitmap;
        paint();
        rerender();
      }),
    [paint],
  );

  /** Kassér: close and delete the file saved for this capture. */
  const abort = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    saveSeq.current++;
    await saving.current;
    st.current.mode = "idle";
    rerender();
    await close(true);
  }, []);

  const backToSelect = () => {
    if (st.current.tall) return; // the long image is the capture now
    Object.assign(st.current, { mode: "select", sel: null, shapes: [], draft: null, start: null, picked: null, drag: null, past: [] });
    paint();
    rerender();
  };

  const onDown = (e: React.PointerEvent) => {
    const s = st.current;
    // A click ends a long screenshot and opens it to draw on.
    if (s.mode === "long") return void finishLong("edit");
    if (e.button === 2) return backToSelect();
    if (e.button !== 0) return;
    const p = toImg(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
    if (s.mode === "select") {
      s.start = p;
      s.sel = null;
    } else if (s.mode === "edit") {
      // A click while typing a comment just finishes the comment.
      if (s.editing !== null) {
        commitText();
        return;
      }
      // A press on a marking picks it; dragging moves it.
      const hit = hitShape(s.shapes, p, k());
      if (hit >= 0) {
        s.picked = hit;
        s.drag = { i: hit, from: p, orig: s.shapes[hit], moved: false };
        paint();
        rerender();
        return;
      }
      s.picked = null;
      const color = s.colors[s.tool];
      if (s.tool === "highlight" || s.tool === "pen") s.draft = { kind: s.tool, color, pts: [p] };
      else if (s.tool === "line") s.draft = { kind: "line", color, a: p, b: p };
      else if (s.tool === "callout") s.draft = { kind: "callout", color, a: p, b: p, text: "" };
      else if (s.tool === "text") s.draft = { kind: "text", color, a: p, size: TEXT.size * k(), text: "" };
      else {
        const n = s.shapes.filter((x) => x.kind === "arrow").length + 1;
        s.draft = { kind: "arrow", color, a: p, b: p, n };
      }
    }
    paint();
  };

  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (s.mode === "select" && s.start) {
      s.sel = normRect(s.start, toImg(e));
      paint();
      rerender();
    } else if (s.mode === "edit" && s.resize) {
      const r = s.resize;
      const dx = toImg(e).x - r.from.x;
      if (!r.moved && Math.abs(dx) < 2 * k()) return;
      if (!r.moved) remember(s);
      r.moved = true;
      s.shapes = s.shapes.map((x, i) => (i === r.i ? resizeText(r.orig, dx, k()) : x));
      paint();
      rerender();
    } else if (s.mode === "edit" && s.drag) {
      const p = toImg(e);
      const d = s.drag;
      const dx = p.x - d.from.x;
      const dy = p.y - d.from.y;
      if (!d.moved && Math.hypot(dx, dy) < 3 * k()) return;
      if (!d.moved) remember(s);
      d.moved = true;
      s.shapes = s.shapes.map((x, i) => (i === d.i ? moveShape(d.orig, dx, dy) : x));
      paint();
    } else if (s.mode === "edit" && !s.draft) {
      // Show that a marking under the pointer can be moved.
      const over = hitShape(s.shapes, toImg(e), k()) >= 0;
      canvasRef.current!.style.cursor = over ? "move" : "";
    } else if (s.mode === "edit" && s.draft) {
      const p = toImg(e);
      const d = s.draft;
      if (d.kind === "highlight" || d.kind === "pen") {
        // Shift = straight stroke
        if (e.shiftKey) d.pts = [d.pts[0], p];
        else d.pts.push(p);
      } else if (d.kind === "line" || d.kind === "arrow" || d.kind === "callout") d.b = p;
      paint();
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const s = st.current;
    if (s.mode === "select" && s.start) {
      const end = toImg(e);
      const r = normRect(s.start, end);
      // A click without a drag takes the whole screen.
      s.sel = r.w < 6 * k() || r.h < 6 * k() ? { x: 0, y: 0, w: shot.current!.w, h: shot.current!.h } : r;
      s.start = null;
      s.mode = "edit";
      scheduleSave(0); // the area is on the clipboard as soon as it is framed
    } else if (s.mode === "edit" && s.resize) {
      if (s.resize.moved) scheduleSave();
      s.resize = null;
    } else if (s.mode === "edit" && s.drag) {
      if (s.drag.moved) scheduleSave();
      s.drag = null;
    } else if (s.mode === "edit" && s.draft) {
      remember(s);
      s.shapes = [...s.shapes, s.draft];
      if (s.draft.kind === "callout" || s.draft.kind === "text") s.editing = s.shapes.length - 1; // type now, save on commit
      else scheduleSave();
      s.draft = null;
    }
    paint();
    rerender();
  };

  const setTool = (t: Tool) => {
    st.current.tool = t;
    st.current.hintGone = true;
    rerender();
  };
  const setColor = (c: string) => {
    const s = st.current;
    s.colors = { ...s.colors, [s.tool]: c };
    // A picked marking takes the colour too.
    if (s.picked !== null && s.shapes[s.picked]) {
      remember(s);
      s.shapes = s.shapes.map((x, i) => (i === s.picked ? { ...x, color: c } : x));
      paint();
      scheduleSave();
    }
    rerender();
  };
  const undo = () => {
    const s = st.current;
    const prev = s.past.pop();
    if (!prev) return;
    s.shapes = prev.shapes;
    if (prev.sel) s.sel = prev.sel;
    s.picked = null;
    paint();
    rerender();
    scheduleSave();
  };
  /** Deletes the picked marking (Del, Backspace or its x). */
  const deletePicked = () => {
    const s = st.current;
    if (s.picked === null) return;
    remember(s);
    s.shapes = renumber(s.shapes.filter((_, i) => i !== s.picked));
    s.picked = null;
    paint();
    rerender();
    scheduleSave();
  };
  /** The corner of a picked text box: drag it to make the text larger or smaller. */
  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const s = st.current;
    const sh = s.picked !== null ? s.shapes[s.picked] : undefined;
    if (e.button !== 0 || sh?.kind !== "text") return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    s.resize = { i: s.picked!, from: toImg(e), orig: sh, moved: false };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!st.current.resize) return;
    e.stopPropagation();
    onMove(e);
  };
  const onResizeUp = (e: React.PointerEvent) => {
    if (!st.current.resize) return;
    e.stopPropagation();
    onUp(e);
  };

  /** A crop handle: drag it to move that edge or corner of the frame. */
  const onCropDown = (h: Handle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const s = st.current;
    if (e.button !== 0 || !s.sel || s.editing !== null) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    s.crop = { h, from: toImg(e), orig: s.sel, moved: false };
    s.hintGone = true;
    s.picked = null;
    rerender();
  };
  const onCropMove = (e: React.PointerEvent) => {
    const s = st.current;
    const c = s.crop;
    if (!c || !shot.current) return;
    e.stopPropagation();
    const p = toImg(e);
    const dx = p.x - c.from.x;
    const dy = p.y - c.from.y;
    if (!c.moved && Math.hypot(dx, dy) < 2 * k()) return;
    let x1 = c.orig.x;
    let y1 = c.orig.y;
    let x2 = c.orig.x + c.orig.w;
    let y2 = c.orig.y + c.orig.h;
    // A reopened screenshot sits on a filler background: never crop out into it.
    const B = s.reopened && s.bounds ? s.bounds : { x: 0, y: 0, w: shot.current.w, h: shot.current.h };
    if (c.h.includes("w")) x1 = clamp(x1 + dx, B.x, x2 - MIN_CROP);
    if (c.h.includes("e")) x2 = clamp(x2 + dx, x1 + MIN_CROP, B.x + B.w);
    if (c.h.includes("n")) y1 = clamp(y1 + dy, B.y, y2 - MIN_CROP);
    if (c.h.includes("s")) y2 = clamp(y2 + dy, y1 + MIN_CROP, B.y + B.h);
    if (!c.moved) remember(s);
    c.moved = true;
    s.sel = { x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) };
    paint();
    rerender();
  };
  const onCropUp = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.crop) return;
    e.stopPropagation();
    if (s.crop.moved) scheduleSave();
    s.crop = null;
    rerender();
  };

  /** Double-click on a comment: type in it again. */
  const onDouble = (e: React.MouseEvent) => {
    const s = st.current;
    if (s.mode !== "edit" || s.editing !== null) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const kk = k();
    const i = hitShape(s.shapes, { x: (e.clientX - r.left) * kk, y: (e.clientY - r.top) * kk }, kk);
    if (i < 0 || (s.shapes[i].kind !== "callout" && s.shapes[i].kind !== "text")) return;
    s.picked = null;
    s.editing = i;
    paint();
    rerender();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = st.current;
      if (s.mode === "idle" || s.editing !== null) return; // the comment field handles its own keys
      const key = e.key.toLowerCase();
      if (s.mode === "long") {
        // Esc saves the long image as it is; a tool key opens it to draw on.
        if (key === "escape" || key === "enter") {
          e.preventDefault();
          finishLong("save");
        } else if (STUDIO && key === "s" && !e.ctrlKey && !e.altKey) finishLong("studio");
        else if (!e.ctrlKey && !e.altKey) {
          const t = TOOLS.find((x) => x.key.toLowerCase() === key);
          if (t) {
            setTool(t.id);
            finishLong("edit");
          }
        }
        return;
      }
      if (key === "escape") {
        e.preventDefault();
        if (s.mode === "edit") done();
        else abort();
      } else if (s.mode !== "edit") return;
      else if (key === "enter" || (e.ctrlKey && key === "c")) done();
      else if (e.ctrlKey && key === "z") undo();
      else if ((key === "delete" || key === "backspace") && s.picked !== null) {
        e.preventDefault();
        deletePicked();
      }
      else if (STUDIO && key === "s" && !e.ctrlKey && !e.altKey) toStudio();
      else if (!STUDIO && key === "g" && !e.ctrlKey && !e.altKey) toGallery();
      else if (!e.ctrlKey && !e.altKey) {
        const t = TOOLS.find((x) => x.key.toLowerCase() === key);
        if (t) setTool(t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, abort, toStudio, toGallery, finishLong]);

  // Esc from the core (the editor may not have the keyboard): same rules as
  // the key, including finishing a comment that is being typed.
  useEffect(
    () =>
      onEscape(() => {
        const s = st.current;
        if (s.mode === "idle") return;
        if (s.mode === "long") finishLong("save");
        else if (s.editing !== null) commitText();
        else if (s.mode === "edit") done();
        else abort();
      }),
    [done, abort, commitText, finishLong],
  );

  const setText = (text: string) => {
    const s = st.current;
    const sh = s.editing !== null ? s.shapes[s.editing] : undefined;
    if (sh?.kind !== "callout" && sh?.kind !== "text") return;
    s.shapes = s.shapes.map((x, i) => (i === s.editing ? { ...sh, text } : x));
    paint();
    rerender();
  };

  const s = st.current;
  const kk = k();
  const selCss = s.sel && { x: s.sel.x / kk, y: s.sel.y / kk, w: s.sel.w / kk, h: s.sel.h / kk };
  // A long image is shown at the scale it was taken at, as tall as it is.
  const dpr = window.devicePixelRatio || 1;
  const sheet: React.CSSProperties | undefined =
    s.tall && shot.current ? { width: shot.current.w / dpr, height: shot.current.h / dpr } : undefined;

  let bar: React.CSSProperties | undefined;
  if (s.mode === "edit" && s.tall) {
    // The long image scrolls under a toolbar that stays at the bottom.
    bar = { position: "fixed", bottom: 20, left: window.innerWidth / 2 };
  } else if (s.mode === "edit" && selCss) {
    const H = 52;
    let top = selCss.y + selCss.h + 12;
    if (top + H > window.innerHeight - 8) top = selCss.y - H - 12;
    if (top < 8) top = selCss.y + selCss.h - H - 12;
    const center = Math.min(Math.max(selCss.x + selCss.w / 2, 300), window.innerWidth - 300);
    bar = { top, left: center };
  }

  return (
    <div className={`stage mode-${s.mode}${s.tall ? " tall" : ""}`} onContextMenu={(e) => e.preventDefault()} onWheel={onWheel}>
      <div className="sheet" style={sheet}>
      <canvas
        ref={canvasRef}
        className="screen"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={onDouble}
      />

      {s.mode === "select" && !s.start && (
        <div className="hint">
          <b>{t.hintDrag}</b> {t.hintDragRest} &nbsp;·&nbsp; <b>{t.hintClick}</b> {t.hintClickRest} &nbsp;·&nbsp; <b>{t.hintScroll}</b> {t.hintScrollRest} &nbsp;·&nbsp; <b>Esc</b> {t.hintEscRest}
          <div className="hint-key">
            {hotkey.current && (
              <>
                {t.hintNext} <kbd>{hotkey.current}</kbd> &nbsp;·&nbsp;{" "}
              </>
            )}
            <span className="ver">Klik {VERSION}</span>
          </div>
        </div>
      )}

      {s.mode === "long" && (
        <div className="hint">
          <b>{t.hintScroll}</b> {t.longMore} &nbsp;·&nbsp; <b>Esc</b> {t.longSave} &nbsp;·&nbsp; <b>{t.hintClick}</b> {t.longMark}
        </div>
      )}

      {selCss && s.mode !== "idle" && !s.tall && (
        <div className="size" style={{ left: selCss.x, top: Math.max(selCss.y - 28, 4) }}>
          {Math.round(s.sel!.w)} × {s.mode === "long" ? s.longH : Math.round(s.sel!.h)}
        </div>
      )}

      {s.mode === "edit" &&
        selCss &&
        !s.tall &&
        !s.reopened &&
        !s.hintGone &&
        !s.shapes.length &&
        !s.draft &&
        s.editing === null &&
        (() => {
          // The wheel makes a long image: say so inside the frame, where the eye is.
          const small = selCss.w < 280 || selCss.h < 150;
          const above = selCss.y > 70;
          const style: React.CSSProperties = !small
            ? { left: selCss.x + selCss.w / 2, top: selCss.y + selCss.h / 2, transform: "translate(-50%, -50%)" }
            : above
              ? { left: selCss.x + selCss.w / 2, top: selCss.y - 40, transform: "translate(-50%, -100%)" }
              : { left: selCss.x + selCss.w / 2, top: selCss.y + selCss.h / 2, transform: "translate(-50%, -50%)" };
          return (
            <div className={`wheel-hint${small ? " small" : ""}`} style={style} aria-hidden>
              <svg className="mouse" viewBox="0 0 28 40" width="28" height="40">
                <rect x="1.5" y="1.5" width="25" height="37" rx="12.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <rect className="wheel" x="12" y="8" width="4" height="8" rx="2" fill="currentColor" />
              </svg>
              {!small && (
                <div className="wheel-text">
                  <b>{t.wheelScroll}</b> {t.wheelScrollRest}
                  <span>{t.wheelEsc}</span>
                </div>
              )}
            </div>
          );
        })()}

      {s.mode === "edit" &&
        selCss &&
        s.editing === null &&
        !s.draft &&
        (() => {
          // In tall mode the sheet is the image's size; measure from that, not
          // from a layout that may not have caught up yet.
          const r = canvasRef.current?.getBoundingClientRect();
          const W = s.tall && shot.current ? shot.current.w / dpr : (r?.width ?? window.innerWidth);
          const H = s.tall && shot.current ? shot.current.h / dpr : (r?.height ?? window.innerHeight);
          const pos: Record<Handle, [number, number]> = {
            nw: [selCss.x, selCss.y],
            n: [selCss.x + selCss.w / 2, selCss.y],
            ne: [selCss.x + selCss.w, selCss.y],
            e: [selCss.x + selCss.w, selCss.y + selCss.h / 2],
            se: [selCss.x + selCss.w, selCss.y + selCss.h],
            s: [selCss.x + selCss.w / 2, selCss.y + selCss.h],
            sw: [selCss.x, selCss.y + selCss.h],
            w: [selCss.x, selCss.y + selCss.h / 2],
          };
          return HANDLES.map((h) => (
            <div
              key={h}
              className={`crop-h${s.crop?.h === h ? " on" : ""}`}
              title={t.cropTitle}
              style={{ left: clamp(pos[h][0], 7, W - 7), top: clamp(pos[h][1], 7, H - 7), cursor: CURSOR[h] }}
              onPointerDown={onCropDown(h)}
              onPointerMove={onCropMove}
              onPointerUp={onCropUp}
            />
          ));
        })()}

      {s.mode === "edit" &&
        s.editing !== null &&
        (() => {
          const sh = s.shapes[s.editing];
          if (sh?.kind !== "callout") return null;
          const { box } = calloutLayout(sh.text || t.writeComment, sh.a, kk);
          return (
            <textarea
              className="comment"
              autoFocus
              placeholder={t.writeComment}
              value={sh.text}
              style={{
                left: box.x / kk,
                top: box.y / kk,
                width: box.w / kk + 2,
                height: box.h / kk,
                borderColor: sh.color,
                fontSize: CALLOUT.font,
                lineHeight: `${CALLOUT.lineH}px`,
                padding: `${CALLOUT.padY - CALLOUT.border}px ${CALLOUT.padX - CALLOUT.border}px`,
              }}
              onChange={(e) => setText(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                // Enter or Esc finishes the comment; Shift+Enter is a new line.
                if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
                  e.preventDefault();
                  commitText();
                }
              }}
            />
          );
        })()}

      {s.mode === "edit" &&
        s.editing !== null &&
        (() => {
          // The canvas draws the box and the letters; this field lies exactly
          // on them, see-through, so the caret and selection sit on the text.
          const sh = s.shapes[s.editing];
          if (sh?.kind !== "text") return null;
          const L = textLayout(sh.text || t.writeText, sh.a, sh.size);
          const lineCss = L.lh / kk;
          const half = (L.lh - (L.ascent + L.descent)) / 2;
          return (
            <textarea
              className="text-field"
              autoFocus
              spellCheck={false}
              value={sh.text}
              style={{
                left: L.origin.x / kk,
                top: (L.origin.y - half - L.ascent) / kk,
                width: (L.box.x + L.box.w - L.origin.x) / kk + sh.size / kk,
                height: lineCss * L.lines.length + 2,
                font: TEXT_FONT(sh.size / kk),
                lineHeight: `${lineCss}px`,
                caretColor: textInk(sh.color),
              }}
              onChange={(e) => setText(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                // Enter or Esc finishes the text; Shift+Enter is a new line.
                if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
                  e.preventDefault();
                  commitText();
                }
              }}
            />
          );
        })()}

      {s.mode === "edit" &&
        s.picked !== null &&
        s.shapes[s.picked]?.kind === "text" &&
        s.editing === null &&
        (() => {
          const f = shapeFrame(s.shapes[s.picked], kk);
          return (
            <div
              className="text-resize"
              title={t.resizeText}
              style={{ left: (f.x + f.w) / kk, top: (f.y + f.h) / kk }}
              onPointerDown={onResizeDown}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeUp}
            />
          );
        })()}

      {s.mode === "edit" &&
        s.picked !== null &&
        s.shapes[s.picked] &&
        (() => {
          const f = shapeFrame(s.shapes[s.picked], kk);
          return (
            <button
              className="pick-x"
              title={t.deleteMark}
              style={{ left: (f.x + f.w) / kk - 12, top: f.y / kk - 12 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={deletePicked}
            >
              <Icon name="close" />
            </button>
          );
        })()}
      </div>

      {s.mode === "edit" && bar && (
        <div className="bar" style={bar} onPointerDown={(e) => e.stopPropagation()}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tool ${s.tool === t.id ? "on" : ""}`}
              title={`${t.label}  (${t.key})`}
              onClick={() => setTool(t.id)}
            >
              <Icon name={t.id} />
            </button>
          ))}
          <span className="sep" />
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${s.colors[s.tool] === c ? "on" : ""}`}
              style={{ "--c": c } as React.CSSProperties}
              title={t.colour}
              onClick={() => setColor(c)}
            />
          ))}
          <span className="sep" />
          <button className="tool" title={t.undo} disabled={!s.past.length} onClick={undo}>
            <Icon name="undo" />
          </button>
          <button className="tool" title={t.discard} onClick={abort}>
            <Icon name="close" />
          </button>
          {!STUDIO && (
            <>
              <span className="sep" />
              <button className="tool" title={t.toGallery} onClick={() => void toGallery()}>
                <Icon name="gallery" />
              </button>
            </>
          )}
          {STUDIO && (
            <button className="to-studio" title={t.toStudioTitle} onClick={toStudio}>
              <Icon name="studio" /> {t.toStudio}
            </button>
          )}
          {(() => {
            // Done says "Copied" for a moment after each save: the image is
            // already on the clipboard, and Esc or Done only closes.
            const flash = s.status === "saved" && Date.now() < s.flashUntil;
            const failed = s.status === "error";
            return (
              <button className={`done${flash ? " flash" : ""}${failed ? " failed" : ""}`} title={t.doneTitle} onClick={done} aria-live="polite">
                {failed ? t.copyFailed : flash ? (<><Icon name="check" /> {t.copied}</>) : t.done}
              </button>
            );
          })()}
        </div>
      )}

      {!inTauri && s.mode === "idle" && s.toast && <div className="toast">{s.toast}</div>}
    </div>
  );
}

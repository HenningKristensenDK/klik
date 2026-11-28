// Shapes and rendering. All coordinates are in image (physical) pixels.

export type Tool = "highlight" | "pen" | "line" | "arrow" | "callout" | "text";
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Shape =
  | { kind: "highlight" | "pen"; color: string; pts: Pt[] }
  | { kind: "line"; color: string; a: Pt; b: Pt }
  | { kind: "arrow"; color: string; a: Pt; b: Pt; n: number }
  /** A comment box at `a`, with an arrow to `b` if `b` is away from the box. */
  | { kind: "callout"; color: string; a: Pt; b: Pt; text: string }
  /** A text box with its top-left corner at `a`; `size` is the font size in image pixels. */
  | { kind: "text"; color: string; a: Pt; size: number; text: string };

/** Sizes in CSS pixels; multiplied by the image scale when drawn. */
const SIZE = { pen: 4, line: 4, highlight: 22, arrow: 5, badge: 15, font: 17 };

/** Comment box: 15px Inter (about 11 pt), readable but small. */
export const CALLOUT = { font: 15, lineH: 20, padX: 10, padY: 7, maxW: 280, minW: 36, radius: 8, border: 2 };
export const CALLOUT_FONT = (px: number) => `500 ${px}px "Inter", "Segoe UI", system-ui, sans-serif`;

/**
 * Text box (1.1, Henning 2026.11.28): one rounded box around all lines, the
 * colour at 75 %, Barlow Semi Condensed 600. The margin from the letters to
 * the edge is the same on all four sides (measured on the glyphs, not the line
 * box), and every measure is a share of the font size, so a corner drag scales
 * text, box and corners together. RTPM content brand: it is part of the image.
 */
export const TEXT = { size: 32, minSize: 10, maxSize: 400, lineH: 1.02, pad: 0.22, radius: 0.117, alpha: 0.75 };
export const TEXT_FONT = (px: number) => `600 ${px}px "Barlow Semi Condensed", "Segoe UI", system-ui, sans-serif`;

/** White text, except on gold, where ink reads better. */
export function textInk(color: string): string {
  return color.toLowerCase() === "#ffcc00" ? "#15162b" : "#ffffff";
}

/** `#rrggbb` at `a` opacity. */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

let measureCtx: OffscreenCanvasRenderingContext2D | null = null;
function measurer() {
  return (measureCtx ??= new OffscreenCanvas(1, 1).getContext("2d")!);
}

/** Word-wrap `text` at `maxW` (newlines kept). */
function wrap(ctx: { measureText(t: string): TextMetrics }, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      const next = line + word;
      if (line && ctx.measureText(next.trimEnd()).width > maxW) {
        out.push(line.trimEnd());
        line = word.trimStart();
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Where a comment box sits and how its text breaks. Image pixels. */
export function calloutLayout(text: string, a: Pt, s: number) {
  const m = measurer();
  m.font = CALLOUT_FONT(CALLOUT.font * s);
  const lines = wrap(m, text || " ", CALLOUT.maxW * s);
  const textW = Math.max(...lines.map((l) => m.measureText(l).width), 0);
  const w = Math.max(textW + 2 * CALLOUT.padX * s, CALLOUT.minW * s);
  const h = lines.length * CALLOUT.lineH * s + 2 * CALLOUT.padY * s;
  return { lines, box: { x: a.x - w / 2, y: a.y - h / 2, w, h } };
}

/**
 * Where a text box sits and where its lines go. Image pixels. The top margin
 * runs from the tallest letter of the first line (at least the cap height, so
 * the box does not jump while typing lower case), the bottom from the lowest
 * letter of the last line, the sides from the outermost letters.
 */
export function textLayout(text: string, a: Pt, size: number) {
  const m = measurer();
  m.font = TEXT_FONT(size);
  const lines = (text || " ").split("\n");
  const ms = lines.map((l) => m.measureText(l || " "));
  const cap = Math.max(m.measureText("H").actualBoundingBoxAscent, ms[0].actualBoundingBoxAscent);
  const lh = size * TEXT.lineH;
  const pad = size * TEXT.pad;
  const inked = ms.filter((_, i) => lines[i].trim());
  const left = inked.length ? Math.min(...inked.map((x) => -x.actualBoundingBoxLeft)) : 0;
  const right = inked.length ? Math.max(...inked.map((x) => x.actualBoundingBoxRight)) : size * 0.3;
  const last = ms[ms.length - 1];
  const below = lines[lines.length - 1].trim() ? Math.max(last.actualBoundingBoxDescent, 0) : 0;
  const w = right - left + 2 * pad;
  const h = cap + (lines.length - 1) * lh + below + 2 * pad;
  return {
    lines,
    box: { x: a.x, y: a.y, w, h },
    /** Where the first line starts: x of the pen, y of the baseline. */
    origin: { x: a.x + pad - left, y: a.y + pad + cap },
    lh,
    radius: size * TEXT.radius,
    /** Font metrics, so a text field can sit exactly on the drawn letters. */
    ascent: last.fontBoundingBoxAscent,
    descent: last.fontBoundingBoxDescent,
  };
}

function textBox(ctx: CanvasRenderingContext2D, sh: Extract<Shape, { kind: "text" }>, placeholder: string | null) {
  const shown = sh.text || placeholder || "";
  const L = textLayout(shown, sh.a, sh.size);
  ctx.fillStyle = rgba(sh.color, TEXT.alpha);
  ctx.beginPath();
  ctx.roundRect(L.box.x, L.box.y, L.box.w, L.box.h, L.radius);
  ctx.fill();
  ctx.font = TEXT_FONT(sh.size);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = textInk(sh.color);
  if (!sh.text) ctx.globalAlpha = 0.6;
  L.lines.forEach((l, i) => ctx.fillText(l, L.origin.x, L.origin.y + i * L.lh));
}

/** Point where the line from the box centre to `b` leaves the box. */
function boxEdge(box: Rect, b: Pt): Pt {
  const c = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const dx = b.x - c.x;
  const dy = b.y - c.y;
  const t = Math.min(dx ? box.w / 2 / Math.abs(dx) : Infinity, dy ? box.h / 2 / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

export function normRect(a: Pt, b: Pt): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

export function inside(r: Rect, p: Pt): boolean {
  return p.x >= r.x && p.y >= r.y && p.x <= r.x + r.w && p.y <= r.y + r.h;
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) {
    ctx.lineTo(pts[0].x + 0.01, pts[0].y);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

function badge(ctx: CanvasRenderingContext2D, p: Pt, n: number, color: string, s: number) {
  const r = SIZE.badge * s;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6 * s;
  ctx.shadowOffsetY = 1.5 * s;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 2.5 * s;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${SIZE.font * s}px "Inter", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), p.x, p.y + 0.5 * s);
}

function arrow(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, s: number, gap = SIZE.badge * s) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const head = 18 * s;
  const start = { x: a.x + Math.cos(ang) * gap, y: a.y + Math.sin(ang) * gap };
  const neck = { x: b.x - Math.cos(ang) * head * 0.8, y: b.y - Math.sin(ang) * head * 0.8 };
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 4 * s;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = SIZE.arrow * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(neck.x, neck.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - Math.cos(ang - 0.45) * head, b.y - Math.sin(ang - 0.45) * head);
  ctx.lineTo(b.x - Math.cos(ang + 0.45) * head, b.y - Math.sin(ang + 0.45) * head);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function callout(ctx: CanvasRenderingContext2D, sh: Extract<Shape, { kind: "callout" }>, s: number, boxHidden: boolean) {
  const { lines, box } = calloutLayout(sh.text, sh.a, s);
  const edge = boxEdge(box, sh.b);
  const inBox = sh.b.x >= box.x && sh.b.x <= box.x + box.w && sh.b.y >= box.y && sh.b.y <= box.y + box.h;
  if (!inBox && Math.hypot(sh.b.x - edge.x, sh.b.y - edge.y) > 14 * s) arrow(ctx, edge, sh.b, sh.color, s, 0);
  if (boxHidden) return;
  ctx.save();
  ctx.shadowColor = "rgba(7,4,116,0.25)";
  ctx.shadowBlur = 8 * s;
  ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, CALLOUT.radius * s);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = CALLOUT.border * s;
  ctx.strokeStyle = sh.color;
  ctx.stroke();
  ctx.fillStyle = "#15162b";
  ctx.font = CALLOUT_FONT(CALLOUT.font * s);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) =>
    ctx.fillText(l, box.x + CALLOUT.padX * s, box.y + CALLOUT.padY * s + (i + 0.5) * CALLOUT.lineH * s),
  );
}

/**
 * `editing`: the marking is being typed in. A comment then shows only its
 * arrow (the text field is its box); a text box shows a placeholder while empty.
 */
export function drawShape(ctx: CanvasRenderingContext2D, sh: Shape, s: number, editing = false, placeholder = "") {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (sh.kind) {
    case "highlight":
      // Multiply keeps the text under the marker readable.
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = SIZE.highlight * s;
      ctx.lineCap = "butt";
      smoothPath(ctx, sh.pts);
      ctx.stroke();
      break;
    case "pen":
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = SIZE.pen * s;
      smoothPath(ctx, sh.pts);
      ctx.stroke();
      break;
    case "line":
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = SIZE.line * s;
      ctx.beginPath();
      ctx.moveTo(sh.a.x, sh.a.y);
      ctx.lineTo(sh.b.x, sh.b.y);
      ctx.stroke();
      break;
    case "arrow": {
      const len = Math.hypot(sh.b.x - sh.a.x, sh.b.y - sh.a.y);
      if (len > (SIZE.badge + 12) * s) arrow(ctx, sh.a, sh.b, sh.color, s);
      badge(ctx, sh.a, sh.n, sh.color, s);
      break;
    }
    case "callout":
      callout(ctx, sh, s, editing);
      break;
    case "text":
      textBox(ctx, sh, editing ? placeholder : null);
      break;
  }
  ctx.restore();
}

/** Navy over the screen: light while you pick the area, so you see what to
 *  frame; darker around a framed area, so the eye stays on it and the rest
 *  still reads. */
export const DIM = { picking: 0.3, framed: 0.5 };

// ---------- Moving and deleting markings ----------

/** The points that define a marking, for hit tests and its frame. */
function keyPoints(sh: Shape, s: number): Pt[] {
  if ("pts" in sh) return sh.pts;
  if (sh.kind === "text") {
    const { box } = textLayout(sh.text, sh.a, sh.size);
    return [{ x: box.x, y: box.y }, { x: box.x + box.w, y: box.y + box.h }];
  }
  if (sh.kind === "callout") {
    const { box } = calloutLayout(sh.text || " ", sh.a, s);
    return [sh.b, { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y + box.h }];
  }
  return [sh.a, sh.b];
}

/** How far from its line a press still counts as on the marking. */
function reach(sh: Shape, s: number): number {
  if (sh.kind === "highlight") return (SIZE.highlight / 2 + 4) * s;
  if (sh.kind === "arrow") return (SIZE.badge + 4) * s;
  if (sh.kind === "text") return 4 * s;
  return 10 * s;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** The topmost marking under `p`, or -1. */
export function hitShape(shapes: Shape[], p: Pt, s: number): number {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const sh = shapes[i];
    const r = reach(sh, s);
    if (sh.kind === "text") {
      const { box } = textLayout(sh.text, sh.a, sh.size);
      if (inside({ x: box.x - r, y: box.y - r, w: box.w + 2 * r, h: box.h + 2 * r }, p)) return i;
      continue;
    }
    if (sh.kind === "callout") {
      const { box } = calloutLayout(sh.text || " ", sh.a, s);
      if (inside({ x: box.x - r / 2, y: box.y - r / 2, w: box.w + r, h: box.h + r }, p)) return i;
      if (distToSegment(p, sh.a, sh.b) <= r) return i;
      continue;
    }
    const pts = "pts" in sh ? sh.pts : [sh.a, sh.b];
    if (pts.length === 1 && Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= r) return i;
    for (let j = 1; j < pts.length; j++) if (distToSegment(p, pts[j - 1], pts[j]) <= r) return i;
  }
  return -1;
}

/** The marking moved by dx, dy. */
export function moveShape(sh: Shape, dx: number, dy: number): Shape {
  const m = (q: Pt) => ({ x: q.x + dx, y: q.y + dy });
  switch (sh.kind) {
    case "highlight":
    case "pen":
      return { ...sh, pts: sh.pts.map(m) };
    case "line":
    case "arrow":
    case "callout":
      return { ...sh, a: m(sh.a), b: m(sh.b) };
    case "text":
      return { ...sh, a: m(sh.a) };
  }
}

/** The frame drawn around a picked marking. Image pixels. */
export function shapeFrame(sh: Shape, s: number): Rect {
  const pts = keyPoints(sh, s);
  const pad = reach(sh, s) + 4 * s;
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

/** Numbered arrows count 1, 2, 3 again after one is deleted. */
/**
 * A text box resized from its bottom-right corner: the corner follows the
 * pointer (`dx` image pixels to the right), the top-left stays, and the font
 * size, margins and corners scale with the box width.
 */
export function resizeText(sh: Extract<Shape, { kind: "text" }>, dx: number, s: number): Extract<Shape, { kind: "text" }> {
  const w = textLayout(sh.text, sh.a, sh.size).box.w;
  const size = (sh.size * Math.max(w + dx, 1)) / w;
  return { ...sh, size: Math.min(Math.max(size, TEXT.minSize * s), TEXT.maxSize * s) };
}

export function renumber(shapes: Shape[]): Shape[] {
  let n = 0;
  return shapes.map((sh) => (sh.kind === "arrow" ? { ...sh, n: ++n } : sh));
}

/** Draw the screen, the dimmed surroundings and the annotations. */

export function render(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sel: Rect | null,
  shapes: Shape[],
  s: number,
  editing: number | null = null,
  /** During a long screenshot: the area as it is now, drawn over the frozen image. */
  live: CanvasImageSource | null = null,
  /** How much RTPM Navy covers the screen outside the selection, 0 to 1. */
  dim = DIM.framed,
  /** The marking picked to move or delete: framed in indigo. */
  picked: number | null = null,
  /** Shown in an empty text box while it is typed in. */
  placeholder = "",
) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.fillStyle = `rgba(7, 4, 116, ${dim})`; // RTPM Navy #070474
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  if (sel) ctx.rect(sel.x, sel.y, sel.w, sel.h);
  ctx.fill("evenodd");
  ctx.restore();

  if (!sel) return;
  if (live) ctx.drawImage(live, sel.x, sel.y, sel.w, sel.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(sel.x, sel.y, sel.w, sel.h);
  ctx.clip();
  shapes.forEach((sh, i) => drawShape(ctx, sh, s, i === editing, placeholder));
  if (picked !== null && shapes[picked]) {
    const f = shapeFrame(shapes[picked], s);
    ctx.strokeStyle = "#0d08d2"; // Primary Indigo: the active state
    ctx.lineWidth = 1.5 * s;
    ctx.setLineDash([5 * s, 4 * s]);
    ctx.beginPath();
    ctx.roundRect(f.x, f.y, f.w, f.h, 6 * s);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * s;
  ctx.setLineDash([6 * s, 4 * s]);
  ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
  ctx.restore();
}

/** The selection with annotations as raw RGBA, prefixed by width and height
 *  (u32 little-endian). Much faster than PNG encoding in the browser; the core
 *  puts it on the clipboard at once and writes the PNG file itself. */
export function exportRgba(img: CanvasImageSource, sel: Rect, shapes: Shape[], s: number): Uint8Array {
  const w = Math.max(1, Math.round(sel.w));
  const h = Math.max(1, Math.round(sel.h));
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(-Math.round(sel.x), -Math.round(sel.y));
  ctx.drawImage(img, 0, 0);
  for (const sh of shapes) drawShape(ctx as unknown as CanvasRenderingContext2D, sh, s);
  const px = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(8 + px.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, w, true);
  dv.setUint32(4, h, true);
  out.set(px, 8);
  return out;
}

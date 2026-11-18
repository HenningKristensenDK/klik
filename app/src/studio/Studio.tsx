// Klik Studio: turn Klik screenshots into a 4:5 LinkedIn carousel or 16:9 slides
// (demo or user walkthrough), exported as PDF + PNG. A window of the Klik app.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lang, setLang, t } from "../i18n";
import { DEFAULT_PROFILE, drawSlide, loadFonts, SIZE, textIssues, type Assets, type Format, type Issue, type Kind, type Profile, type Slide } from "./render";
import { editCapture, listCaptures, listClaudeDrafts, onAddShot, onCaptureSaved, openExports, readCapture, takeScreenshot, type Capture, type ClaudeDraft } from "./io";
import { exportDeck } from "./export";

const STORE = "klik-studio-v1";

const uid = () => Math.random().toString(36).slice(2, 9);

const KIND_LABEL: Record<Kind, string> = t.studio.kinds;

function blank(kind: Kind, shot?: string): Slide {
  switch (kind) {
    case "cover":
      return { id: uid(), kind, tag: "[Topic]", headline: "[Headline, 5 to 7 words]", highlight: "", body: "[One line: who this is for]" };
    case "closer":
      return { id: uid(), kind, tag: "", headline: "Recognise this on your project?", highlight: "on your project?", body: "[One low-friction offer line]" };
    case "text":
      return { id: uid(), kind, tag: "", headline: "[One idea per slide]", highlight: "", body: "[Max 25 words]" };
    case "rule":
      return { id: uid(), kind, tag: "", headline: "[The rule, 5 to 7 words]", highlight: "", body: "[Why it holds, max 25 words]", bodyHighlight: "", inPractice: "[What it looks like in the reader's own tools]" };
    default:
      return { id: uid(), kind, tag: "", headline: "[What this screen shows]", highlight: "", body: "", shot };
  }
}

type Saved = { fmt: Format; title: string; slides: Slide[]; profile: Profile; angle?: string };

const KINDS: Kind[] = ["cover", "shot", "rule", "text", "closer"];

type RawSlide = Partial<Slide> & { body_highlight?: string; in_practice?: string };

function withDefaults(p: Partial<Profile> | undefined): Profile {
  return {
    ...DEFAULT_PROFILE,
    ...p,
    experience: p?.experience ?? DEFAULT_PROFILE.experience,
    photo: p?.photo ?? null,
    logo: p?.logo ?? null,
  };
}

/** Reads a deck Claude wrote: {format, title, angle, slides:[...]} or a bare slide array. */
function parseDeck(raw: string): { fmt?: Format; title?: string; angle?: string; slides: Slide[] } {
  const m = raw.match(/[\[{][\s\S]*[\]}]/);
  const data = JSON.parse(m ? m[0] : raw) as unknown;
  const obj = (Array.isArray(data) ? { slides: data } : data) as { format?: string; title?: string; angle?: string; slides?: RawSlide[] };
  if (!Array.isArray(obj.slides) || !obj.slides.length) throw new Error("no slides");
  const slides = obj.slides.map((r) => {
    const kind = KINDS.includes(r.kind as Kind) ? (r.kind as Kind) : r.shot ? "shot" : "text";
    return {
      id: r.id ?? uid(),
      kind,
      tag: r.tag ?? "",
      headline: r.headline ?? "",
      highlight: r.highlight ?? "",
      body: r.body ?? "",
      bodyHighlight: r.bodyHighlight ?? r.body_highlight ?? "",
      inPractice: r.inPractice ?? r.in_practice ?? "",
      shot: r.shot,
    } as Slide;
  });
  const fmt = obj.format === "16x9" || obj.format === "16:9" ? "16x9" : obj.format === "4x5" || obj.format === "4:5" ? "4x5" : undefined;
  return { fmt, title: obj.title, angle: obj.angle, slides };
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? "");
    if (s && Array.isArray(s.slides)) return { ...s, profile: withDefaults(s.profile) };
  } catch {
    /* first run */
  }
  return {
    fmt: "4x5",
    title: t.studio.newPost,
    slides: [blank("cover"), blank("closer")],
    profile: withDefaults(undefined),
  };
}

async function bitmapFromDataUrl(url: string): Promise<ImageBitmap> {
  const b = await (await fetch(url)).blob();
  return createImageBitmap(b);
}

/** A small PNG data URL (longest side max px), so the saved deck stays light. */
async function smallDataUrl(f: File, max: number): Promise<{ url: string; bmp: ImageBitmap }> {
  const src = await createImageBitmap(f);
  const s = Math.min(1, max / Math.max(src.width, src.height));
  const c = new OffscreenCanvas(Math.round(src.width * s), Math.round(src.height * s));
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  const blob = await c.convertToBlob({ type: "image/png" });
  const url = await new Promise<string>((ok) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.readAsDataURL(blob);
  });
  return { url, bmp: await createImageBitmap(blob) };
}

export function Studio() {
  const init = useMemo(load, []);
  const [fmt, setFmt] = useState<Format>(init.fmt);
  const [title, setTitle] = useState(init.title);
  const [slides, setSlides] = useState<Slide[]>(init.slides);
  const [profile, setProfile] = useState<Profile>(init.profile);
  const [sel, setSel] = useState(init.slides[0]?.id ?? "");
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [claudeOpen, setClaudeOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [angle, setAngle] = useState(init.angle ?? "");
  const [drafts, setDrafts] = useState<ClaudeDraft[]>([]);
  const assets = useRef<Assets>({ shots: new Map(), photo: null, logoWhite: null });
  const canvas = useRef<HTMLCanvasElement>(null);
  const [, bump] = useState(0);

  // Persist the deck so closing the window never loses work.
  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify({ fmt, title, slides, profile, angle } satisfies Saved));
  }, [fmt, title, slides, profile, angle]);

  const refresh = useCallback(async () => {
    const list = await listCaptures();
    setCaptures(list);
    listClaudeDrafts().then(setDrafts).catch(() => setDrafts([]));
    for (const c of list) {
      if (assets.current.shots.has(c.name)) continue;
      const blob = await readCapture(c.name);
      assets.current.shots.set(c.name, await createImageBitmap(blob));
      const url = URL.createObjectURL(blob);
      setThumbs((t) => ({ ...t, [c.name]: url }));
    }
    bump((n) => n + 1);
  }, []);

  useEffect(() => {
    (async () => {
      await loadFonts();
      if (init.profile.logo) assets.current.logoWhite = await bitmapFromDataUrl(init.profile.logo).catch(() => null);
      if (init.profile.photo) assets.current.photo = await bitmapFromDataUrl(init.profile.photo).catch(() => null);
      await refresh();
      // Shots referenced by a saved deck but no longer in the recent list.
      for (const s of init.slides) {
        if (s.shot && !assets.current.shots.has(s.shot)) {
          try {
            assets.current.shots.set(s.shot, await createImageBitmap(await readCapture(s.shot)));
          } catch {
            /* file was deleted */
          }
        }
      }
      setReady(true);
    })();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [init, refresh]);

  const current = slides.find((s) => s.id === sel) ?? slides[0];
  const index = slides.findIndex((s) => s.id === current?.id);

  // Redraw the preview on every change.
  useEffect(() => {
    if (!ready || !current || !canvas.current) return;
    const c = canvas.current;
    const { w, h } = SIZE[fmt];
    c.width = w;
    c.height = h;
    setIssues(drawSlide(c.getContext("2d")!, fmt, slides, index, profile, assets.current));
  }, [ready, current, index, slides, fmt, profile]);

  const update = (patch: Partial<Slide>) => setSlides((all) => all.map((s) => (s.id === current.id ? { ...s, ...patch } : s)));

  const insertBeforeCloser = (s: Slide) => {
    setSlides((all) => {
      const at = all.findIndex((x) => x.kind === "closer");
      const next = [...all];
      next.splice(at < 0 ? next.length : at, 0, s);
      return next;
    });
    setSel(s.id);
  };

  // The editor's Studio button: the screenshot just taken becomes a slide.
  useEffect(
    () =>
      onAddShot(async (name) => {
        try {
          const blob = await readCapture(name);
          assets.current.shots.set(name, await createImageBitmap(blob));
          setThumbs((t) => ({ ...t, [name]: URL.createObjectURL(blob) }));
        } catch {
          return; // the file is gone; add nothing
        }
        insertBeforeCloser(blank("shot", name));
        refresh();
      }),
    // insertBeforeCloser only uses state setters, so the listener stays valid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh],
  );

  // A screenshot was marked again in the editor: redraw its thumbnail and slides.
  useEffect(
    () =>
      onCaptureSaved(async (name) => {
        try {
          const blob = await readCapture(name);
          assets.current.shots.get(name)?.close();
          assets.current.shots.set(name, await createImageBitmap(blob));
          setThumbs((t) => {
            if (t[name]) URL.revokeObjectURL(t[name]);
            return { ...t, [name]: URL.createObjectURL(blob) };
          });
          setSlides((all) => [...all]); // same slides, new pixels: redraw the preview
        } catch {
          /* the file is gone */
        }
      }),
    [],
  );

  const reopen = async (name: string) => {
    try {
      await editCapture(name);
    } catch (e) {
      setNote(String(e));
    }
  };

  const move = (d: -1 | 1) =>
    setSlides((all) => {
      const i = all.findIndex((s) => s.id === current.id);
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = () => {
    if (slides.length <= 1) return;
    const i = slides.findIndex((s) => s.id === current.id);
    const next = slides.filter((s) => s.id !== current.id);
    setSlides(next);
    setSel(next[Math.max(0, i - 1)].id);
  };

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    const { url, bmp } = await smallDataUrl(f, 400);
    assets.current.photo = bmp;
    setProfile((p) => ({ ...p, photo: url }));
  };

  /** A light logo for the dark closer slide, e.g. a white wordmark PNG or SVG. */
  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    const { url, bmp } = await smallDataUrl(f, 800);
    assets.current.logoWhite = bmp;
    setProfile((p) => ({ ...p, logo: url }));
  };
  const removeLogo = () => {
    assets.current.logoWhite = null;
    setProfile((p) => ({ ...p, logo: null }));
  };

  const allIssues = useMemo(() => slides.flatMap((s, i) => textIssues(s).map((x) => ({ n: i + 1, ...x }))), [slides]);
  const count = slides.length;
  const lengthWarn = fmt === "4x5" && (count < 6 || count > 9) ? t.studio.lengthWarn(count) : "";

  const doExport = async () => {
    setBusy(t.studio.exporting);
    setNote("");
    try {
      const r = await exportDeck(fmt, slides, profile, assets.current, title);
      const stops = r.issues.filter((x) => x.issue.level === "stop");
      setNote(t.studio.saved(r.files.length, r.folder, stops.length));
      await openExports(r.folder);
    } catch (e) {
      setNote(t.studio.exportFailed(String(e)));
    } finally {
      setBusy("");
    }
  };

  const claudeBrief = () => {
    const shots = slides.filter((s) => s.shot).map((s) => s.shot);
    return [
      `Make a ${fmt === "4x5" ? "4:5 LinkedIn carousel (6 to 9 slides)" : "16:9 presentation for a demo or user walkthrough"} in Klik Studio.`,
      `Audience and angle: ${angle.trim() || "[who it is for, and the situation they recognise]"}.`,
      shots.length
        ? `Use these Klik screenshots: ${shots.join(", ")}. Look at each one with klik_get_capture.`
        : "Look at my recent screenshots with klik_list_captures and klik_get_capture, and pick the ones that tell the story.",
      "Story arc: a recognisable project situation, the usual answer, the turn, what they see (one item, one owner), why it holds, the offer.",
      "Writing rules: sentence case, no em-dashes, headline 5 to 7 words, body max 25 words, one highlight of 1 to 4 words taken from the headline, show do not pitch, no URLs, no unapproved numbers (write [placeholder]), sample data labelled. Never describe a customer system unless I say the customer approved it.",
      "Slide kinds: cover (dark: tag names the topic, body names the reader), shot (one screenshot, light), rule (light: one rule, body with one bodyHighlight span, and inPractice saying what the rule looks like in the reader's own tools; numbered automatically), text (light), closer (dark, one question or offer).",
      "One highlight per slide: on a rule slide use bodyHighlight or highlight, not both.",
      "When done, save it with handoff_write. Title starts with \"Klik deck:\". In the text, put the deck in a fenced block marked klik-deck containing JSON:",
      '{"format":"' + fmt + '","title":"...","angle":"...","slides":[{"kind":"cover|shot|rule|text|closer","shot":"file name or omit","tag":"","headline":"","highlight":"","body":"","bodyHighlight":"rule only","inPractice":"rule only"}]}',
      "Then tell me in two lines which angle you chose and why.",
    ].join("\n");
  };

  const applyDeck = (raw: string, from: string) => {
    try {
      const d = parseDeck(raw);
      if (d.fmt) setFmt(d.fmt);
      if (d.title) setTitle(d.title);
      if (d.angle) setAngle(d.angle);
      setSlides(d.slides);
      setSel(d.slides[0].id);
      // Load any screenshot the draft uses that is not loaded yet.
      d.slides.forEach(async (s) => {
        if (s.shot && !assets.current.shots.has(s.shot)) {
          try {
            assets.current.shots.set(s.shot, await createImageBitmap(await readCapture(s.shot)));
            bump((n) => n + 1);
          } catch {
            /* missing file shows as an empty card */
          }
        }
      });
      setNote(t.studio.draftLoaded(from, d.slides.length));
      setReply("");
      setClaudeOpen(false);
    } catch {
      setNote(t.studio.draftBad);
    }
  };

  if (!current) return null;
  const { w, h } = SIZE[fmt];

  return (
    <div className="studio">
      <header className="st-top">
        <div className="st-brand">Klik <span>Studio</span></div>
        <input className="st-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label={t.studio.titleAria} />
        <div className="seg" role="tablist" aria-label="Format">
          <button className={fmt === "4x5" ? "on" : ""} onClick={() => setFmt("4x5")}>{t.studio.fmt4x5}</button>
          <button className={fmt === "16x9" ? "on" : ""} onClick={() => setFmt("16x9")}>{t.studio.fmt16x9}</button>
        </div>
        {/* Language of Klik's own texts. The deck is saved, so reloading loses nothing. */}
        <div className="lang" role="group" aria-label="Language / Sprog">
          {(["en", "da"] as const).map((l) => (
            <button key={l} className={lang === l ? "on" : ""} aria-pressed={lang === l} onClick={() => { if (l !== lang) { setLang(l); location.reload(); } }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="ghost" onClick={() => { setClaudeOpen((o) => !o); refresh(); }}>{t.studio.claude}{drafts.length ? t.studio.drafts(drafts.length) : ""}</button>
        <button className="primary" disabled={!!busy || !ready} onClick={doExport}>{busy || t.studio.exportBtn}</button>
      </header>

      <aside className="st-shots">
        <div className="st-h">
          <span>{t.studio.screenshots}</span>
          <button className="link" onClick={refresh}>{t.studio.refresh}</button>
        </div>
        <button className="ghost st-newshot" title={t.studio.newShotTitle} onClick={() => void takeScreenshot()}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
            <path d="M12 9v6M9 12h6" />
          </svg>
          {t.studio.newShot}
        </button>
        <p className="st-hint">{t.studio.clickToAdd}</p>
        <div className="shot-grid">
          {captures.map((c) => (
            <div key={c.name} className="shot-cell">
              <button className="shot" title={`${t.studio.addShot}: ${c.name}`} onClick={() => insertBeforeCloser(blank("shot", c.name))}>
                {thumbs[c.name] ? <img src={thumbs[c.name]} alt="" /> : <span />}
              </button>
              <button className="shot-edit" title={t.studio.editShot} aria-label={t.studio.editShot} onClick={() => reopen(c.name)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.5 4.5l5 5L9 20H4v-5z" />
                </svg>
              </button>
            </div>
          ))}
          {!captures.length && <p className="st-hint">{t.studio.noShots}</p>}
        </div>
      </aside>

      <nav className="st-list">
        <div className="st-h"><span>{t.studio.slides(count)}</span></div>
        <ol>
          {slides.map((s, i) => (
            <li key={s.id}>
              <button className={s.id === current.id ? "on" : ""} onClick={() => setSel(s.id)}>
                <b>{i + 1}</b>
                <span className="k">{KIND_LABEL[s.kind]}</span>
                <span className="t">{s.headline || t.studio.untitled}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="row">
          <button className="ghost sm" onClick={() => insertBeforeCloser(blank("rule"))}>{t.studio.addRule}</button>
          <button className="ghost sm" onClick={() => insertBeforeCloser(blank("text"))}>{t.studio.addText}</button>
          <button className="ghost sm" onClick={() => move(-1)} aria-label={t.studio.moveUp} title={t.studio.moveUp}>↑</button>
          <button className="ghost sm" onClick={() => move(1)} aria-label={t.studio.moveDown} title={t.studio.moveDown}>↓</button>
          <button className="ghost sm" onClick={remove}>{t.studio.remove}</button>
        </div>
        {lengthWarn && <p className="warn">{lengthWarn}</p>}

        <div className="st-h"><span>{t.studio.profile}</span></div>
        <label className="fld">{t.studio.name}<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
        <label className="fld">{t.studio.role}<input value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} /></label>
        <label className="fld">{t.studio.experience}<input value={profile.experience ?? ""} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} /></label>
        <label className="fld">{t.studio.photo}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </label>
        <label className="fld">{t.studio.logo}
          <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={(e) => pickLogo(e.target.files?.[0])} />
        </label>
        {profile.logo && <button className="link" onClick={removeLogo}>{t.studio.removeLogo}</button>}
      </nav>

      <main className="st-main">
        <div className="preview" style={{ aspectRatio: `${w} / ${h}` }}>
          <canvas ref={canvas} />
        </div>
        <section className="edit">
          <div className="row">
            <label className="fld grow">{t.studio.tag}<input value={current.tag} onChange={(e) => update({ tag: e.target.value })} placeholder={t.studio.optional} /></label>
            <label className="fld">{t.studio.kind}
              <select value={current.kind} onChange={(e) => update({ kind: e.target.value as Kind })}>
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
          </div>
          <label className="fld">{t.studio.headline}<textarea rows={2} value={current.headline} onChange={(e) => update({ headline: e.target.value })} /></label>
          <label className="fld">{t.studio.highlight}<input value={current.highlight} onChange={(e) => update({ highlight: e.target.value })} placeholder={t.studio.none} /></label>
          <label className="fld">{t.studio.body}<textarea rows={3} value={current.body} onChange={(e) => update({ body: e.target.value })} /></label>
          {current.kind === "rule" && (
            <>
              <label className="fld">{t.studio.bodyHighlight}<input value={current.bodyHighlight ?? ""} onChange={(e) => update({ bodyHighlight: e.target.value })} placeholder={t.studio.none} /></label>
              <label className="fld">{t.studio.inPractice}<textarea rows={2} value={current.inPractice ?? ""} onChange={(e) => update({ inPractice: e.target.value })} /></label>
            </>
          )}
          {current.kind === "shot" && (
            <label className="fld">{t.studio.screenshot}
              <select value={current.shot ?? ""} onChange={(e) => update({ shot: e.target.value })}>
                {captures.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                {current.shot && !captures.some((c) => c.name === current.shot) && <option value={current.shot}>{current.shot}</option>}
              </select>
            </label>
          )}
          <ul className="issues">
            {issues.map((x, i) => <li key={i} className={x.level}>{x.text}</li>)}
            {!issues.length && <li className="ok">{t.studio.ready}</li>}
          </ul>
          {allIssues.some((x) => x.level === "stop") && (
            <p className="warn">{t.studio.otherSlides([...new Set(allIssues.filter((x) => x.level === "stop").map((x) => x.n))].join(", "))}</p>
          )}
        </section>
      </main>

      {claudeOpen && (
        <div className="claude">
          <label className="fld">{t.studio.angle}
            <textarea rows={2} value={angle} onChange={(e) => setAngle(e.target.value)} placeholder={t.studio.anglePlaceholder} />
          </label>
          <p><b>1.</b> {t.studio.step1}</p>
          <div className="row">
            <button className="ghost" onClick={() => navigator.clipboard.writeText(claudeBrief()).then(() => setNote(t.studio.briefCopied))}>{t.studio.copyBrief}</button>
            <button className="link" onClick={refresh}>{t.studio.findDrafts}</button>
          </div>
          <p><b>2.</b> {t.studio.step2}</p>
          <ul className="drafts">
            {drafts.map((d) => (
              <li key={d.file}>
                <span>{d.title.replace(/^Klik deck:\s*/i, "")}</span>
                <button className="accent sm" onClick={() => applyDeck(d.deck, t.studio.fromClaude)}>{t.studio.use}</button>
              </li>
            ))}
            {!drafts.length && <li className="st-hint">{t.studio.noDrafts}</li>}
          </ul>
          <details>
            <summary>{t.studio.noConnector}</summary>
            <textarea rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t.studio.pasteJson} />
            <button className="ghost sm" onClick={() => applyDeck(reply, t.studio.fromPaste)} disabled={!reply.trim()}>{t.studio.useReply}</button>
          </details>
          <div className="row"><button className="ghost" onClick={() => setClaudeOpen(false)}>{t.studio.close}</button></div>
        </div>
      )}

      {note && <div className="st-note" role="status">{note}</div>}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { editCapture, listCaptures, onCaptureSaved, readCapture, takeScreenshot, type Capture } from "./studio/io";
import { t } from "./i18n";
import { VERSION } from "./version";

/**
 * Klik 1.0's window: every screenshot, newest first. One click opens it in the
 * editor to mark or crop it again. Studio's slides stay hidden until Studio 2.
 */
export function Gallery() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState("");
  /** Thumbnail per file, with the file's change time it was made from. */
  const urls = useRef(new Map<string, { url: string; modified: number }>());

  /**
   * Reads a thumbnail again when the file changed (a crop or new markings keep
   * the same name), so the gallery never shows a stale picture.
   */
  const loadThumb = useCallback(async (name: string, modified: number) => {
    const had = urls.current.get(name);
    if (had && had.modified === modified) return;
    try {
      const url = URL.createObjectURL(await readCapture(name));
      if (had) URL.revokeObjectURL(had.url);
      urls.current.set(name, { url, modified });
      setThumbs((all) => ({ ...all, [name]: url }));
    } catch {
      /* the file was deleted */
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = [...(await listCaptures())].sort((a, b) => b.modified - a.modified);
      setCaptures(list);
      for (const c of list) await loadThumb(c.name, c.modified);
    } catch (e) {
      setNote(String(e));
    }
    setLoaded(true);
  }, [loadThumb]);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    // A screenshot marked or cropped again: show its new look.
    const off = onCaptureSaved((name) => {
      // Mark it stale, so the refresh reads the new picture exactly once.
      const had = urls.current.get(name);
      if (had) had.modified = -1;
      refresh();
    });
    return () => {
      window.removeEventListener("focus", refresh);
      off();
    };
  }, [refresh, loadThumb]);

  const open = async (name: string) => {
    setNote("");
    try {
      await editCapture(name);
    } catch (e) {
      setNote(String(e));
    }
  };

  /** "2026.11.25 - 12:04": the date as in Klik's file names, 24-hour time. */
  const when = (ms: number) => {
    const d = new Date(ms);
    const two = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} - ${two(d.getHours())}:${two(d.getMinutes())}`;
  };

  return (
    <div className="gallery">
      <header className="g-top">
        <span className="g-brand">
          <svg viewBox="0 0 100 100" width="26" height="26" aria-hidden>
            <path d="M0 0H47.4V29.2H29.2V47.4H0Z" />
            <path d="M100 0V47.4H70.8V29.2H52.6V0Z" />
            <path d="M0 100V52.6H29.2V70.8H47.4V100Z" />
            <path d="M100 100H52.6V70.8H70.8V52.6H100Z" />
            <circle cx="50" cy="50" r="11" />
          </svg>
          Klik <small>{VERSION}</small>
        </span>
        <span className="g-hint">{t.galleryHint}</span>
        <button className="g-new" onClick={() => void takeScreenshot()}>
          {t.galleryNew}
        </button>
      </header>
      {note && <p className="g-note">{note}</p>}
      {loaded && !captures.length && <p className="g-empty">{t.galleryEmpty}</p>}
      <main className="g-grid">
        {captures.map((c) => (
          <button key={c.name} className="g-cell" title={t.galleryOpen} onClick={() => open(c.name)}>
            {thumbs[c.name] ? <img src={thumbs[c.name]} alt={c.name} /> : <span className="g-blank" />}
            <span className="g-when">{when(c.modified)}</span>
          </button>
        ))}
      </main>
      <footer className="g-foot">{t.byRtpm}</footer>
    </div>
  );
}

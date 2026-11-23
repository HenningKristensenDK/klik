//! Klik: capture core.
//!
//! Klik Studio (a second window, opened from the tray) turns screenshots into
//! a 4:5 carousel or 16:9 slides; its file access is at "Klik Studio" below.
//!
//! Flow: hotkey -> capture the monitor under the cursor -> the overlay window
//! covers that monitor and shows the frozen image -> the user selects an area,
//! which is saved to Pictures\Klik and put on the clipboard at once -> every
//! marking updates both -> Esc closes. The wheel on a selected area makes a
//! long screenshot (see "Long screenshot" below).

mod stitch;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

const OVERLAY: &str = "overlay";
const STUDIO: &str = "studio";

/// The last captured monitor image: (width, height, RGBA bytes).
#[derive(Default)]
struct Shot(Mutex<Option<(u32, u32, Vec<u8>)>>);

/// The file saved for the capture on screen, overwritten on every change.
#[derive(Default)]
struct CurrentFile(Mutex<Option<PathBuf>>);

/// A saved screenshot reopened in the editor from Studio: its path and its
/// original bytes, so ✕ can put the original back instead of deleting it.
#[derive(Default)]
struct Editing(Mutex<Option<(PathBuf, Vec<u8>)>>);

/// The hotkey Klik got, shown in the tray menu and the overlay hint.
#[derive(Default)]
struct Hotkey(Mutex<Option<String>>);

/// `klik.exe --shot` takes a screenshot. The first launch has to wait until the
/// overlay page is loaded, so the request is parked here until `frontend_ready`.
static CAPTURE_ON_READY: AtomicBool = AtomicBool::new(false);

/// Set when Studio's Screenshot button hid Studio, so it comes back after.
static RETURN_TO_STUDIO: AtomicBool = AtomicBool::new(false);

/// The app id the installer puts on Klik's shortcuts, so the jump list and
/// Studio's taskbar button belong to the pinned Klik icon.
const APP_ID: &str = "dk.rtpm.klik";

/// Hotkeys to try, in order. The first one no other program owns wins.
/// PrtScn is left alone on purpose: Snagit and Windows' Snipping Tool use it.
fn hotkey_candidates() -> Vec<(Shortcut, &'static str)> {
    vec![
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyK), "Ctrl+Alt+K"),
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyK), "Ctrl+Shift+K"),
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyS), "Ctrl+Alt+S"),
        (Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyX), "Ctrl+Shift+X"),
    ]
}

/// Esc, caught from Windows while the editor is open. The editor window does
/// not always get the keyboard (Windows refuses focus to a window that opens
/// while another program is in front), and then Esc went to that program and
/// the editor stayed open. Registered on show, released on close.
fn escape_key() -> Shortcut {
    Shortcut::new(None, Code::Escape)
}

fn grab_escape(app: &AppHandle) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let gs = app.global_shortcut();
    if !gs.is_registered(escape_key()) {
        if let Err(e) = gs.register(escape_key()) {
            eprintln!("klik: Esc could not be caught: {e}");
        }
    }
}

fn release_escape(app: &AppHandle) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let gs = app.global_shortcut();
    if gs.is_registered(escape_key()) {
        let _ = gs.unregister(escape_key());
    }
}

fn overlay(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(OVERLAY)
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/// Capture the monitor under the cursor and hand it to the overlay.
fn capture(app: &AppHandle) -> Result<(), String> {
    let win = overlay(app).ok_or("overlay window missing")?;
    if win.is_visible().unwrap_or(false) {
        // Already capturing: bring the editor forward instead of ignoring the
        // hotkey, so an editor hidden behind another window is never stuck.
        win.set_always_on_top(true).map_err(err)?;
        win.set_focus().map_err(err)?;
        grab_escape(app);
        return Ok(());
    }
    let cursor = app.cursor_position().map_err(err)?;
    let mon = xcap::Monitor::from_point(cursor.x as i32, cursor.y as i32).map_err(err)?;
    let img = mon.capture_image().map_err(err)?;
    let (w, h) = (img.width(), img.height());
    let (x, y) = (mon.x().map_err(err)?, mon.y().map_err(err)?);

    *app.state::<Shot>().0.lock().unwrap() = Some((w, h, img.into_raw()));
    app.state::<CurrentFile>().0.lock().unwrap().take();
    app.state::<Editing>().0.lock().unwrap().take();

    win.set_position(PhysicalPosition::new(x, y)).map_err(err)?;
    win.set_size(PhysicalSize::new(w, h)).map_err(err)?;
    // The overlay pulls the image with `get_shot`, draws it, then calls
    // `show_overlay`, so the old frame never flashes.
    win.emit("captured", None::<[u32; 4]>).map_err(err)?;
    Ok(())
}

/// Ink `#15162b`, behind a reopened screenshot.
const BACKDROP: [u8; 4] = [0x15, 0x16, 0x2b, 0xff];

/// Puts `img` in the middle of a monitor-sized backdrop. Returns the RGBA
/// pixels and where the image sits (x, y, w, h), which the editor selects.
fn compose(mon_w: u32, mon_h: u32, img: &image::RgbaImage) -> Result<(Vec<u8>, [u32; 4]), String> {
    let (w, h) = img.dimensions();
    if w > mon_w || h > mon_h {
        return Err(format!("The screenshot ({w} x {h}) is larger than this screen ({mon_w} x {mon_h})."));
    }
    let (x0, y0) = ((mon_w - w) / 2, (mon_h - h) / 2);
    let mut out = BACKDROP.repeat((mon_w * mon_h) as usize);
    let row = (w * 4) as usize;
    for y in 0..h {
        let src = (y * w * 4) as usize;
        let dst = (((y0 + y) * mon_w + x0) * 4) as usize;
        out[dst..dst + row].copy_from_slice(&img.as_raw()[src..src + row]);
    }
    Ok((out, [x0, y0, w, h]))
}

/// Studio's pencil: reopen a saved screenshot in the editor, already
/// selected, so new markings go on top. Every change saves over the same
/// file, and Studio redraws the slides that use it.
#[tauri::command(async)]
fn edit_capture(app: AppHandle, name: String) -> Result<(), String> {
    let win = overlay(&app).ok_or("overlay window missing")?;
    if win.is_visible().unwrap_or(false) {
        return Err("Klik is already capturing".into());
    }
    let path = output_dir(&app)?.join(safe_name(&name)?);
    let bytes = std::fs::read(&path).map_err(err)?;
    let img = image::load_from_memory(&bytes).map_err(err)?.to_rgba8();
    let cursor = app.cursor_position().map_err(err)?;
    let mon = xcap::Monitor::from_point(cursor.x as i32, cursor.y as i32).map_err(err)?;
    let (mw, mh) = (mon.width().map_err(err)?, mon.height().map_err(err)?);
    let (rgba, sel) = compose(mw, mh, &img)?;

    *app.state::<Shot>().0.lock().unwrap() = Some((mw, mh, rgba));
    *app.state::<CurrentFile>().0.lock().unwrap() = Some(path.clone());
    *app.state::<Editing>().0.lock().unwrap() = Some((path, bytes));

    win.set_position(PhysicalPosition::new(mon.x().map_err(err)?, mon.y().map_err(err)?)).map_err(err)?;
    win.set_size(PhysicalSize::new(mw, mh)).map_err(err)?;
    win.emit("captured", Some(sel)).map_err(err)?;
    Ok(())
}

/// Tells Studio a screenshot file changed, so it redraws slides that use it.
fn announce_saved(app: &AppHandle, path: &std::path::Path) {
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        let _ = app.emit_to(STUDIO, "capture-saved", name);
    }
}

fn capture_async(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = capture(&app) {
            eprintln!("klik: capture failed: {e}");
        }
    });
}

/// Image bytes for the overlay: 8-byte header (width, height as u32 LE) + RGBA.
fn shot_bytes(w: u32, h: u32, rgba: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(8 + rgba.len());
    out.extend_from_slice(&w.to_le_bytes());
    out.extend_from_slice(&h.to_le_bytes());
    out.extend_from_slice(rgba);
    out
}

#[tauri::command]
fn get_shot(shot: tauri::State<'_, Shot>) -> Result<Response, String> {
    let guard = shot.0.lock().unwrap();
    let (w, h, rgba) = guard.as_ref().ok_or("no capture")?;
    Ok(Response::new(shot_bytes(*w, *h, rgba)))
}

// ---------- Long screenshot ----------
// After an area is selected, the wheel makes a long screenshot. Each wheel
// step goes to the window below the editor, the area is grabbed with the
// editor left out of the picture, and `stitch` joins the grabs into one tall
// image. Down only.

/// A long screenshot in progress.
struct LongShot {
    stitch: stitch::Stitcher,
    /// The monitor's top-left corner, to find it again for each grab.
    origin: (i32, i32),
    /// The selected area in monitor pixels: x, y, w, h.
    area: [u32; 4],
    /// How far the page moved per wheel notch at the last step.
    per_notch: Option<f64>,
}

impl LongShot {
    /// Notches to send in one step: enough to move about half the area, so
    /// the next grab still overlaps the last one.
    fn notches(&self) -> u32 {
        match self.per_notch {
            Some(p) if p >= 1.0 => ((self.area[3] as f64 * 0.5 / p).floor() as u32).clamp(1, 5),
            _ => 1,
        }
    }
}

#[derive(Default)]
struct Long(Mutex<Option<LongShot>>);

/// Wheel notches waiting to be sent. One worker thread sends them.
static LONG_PENDING: AtomicU32 = AtomicU32::new(0);
static LONG_WORKING: AtomicBool = AtomicBool::new(false);
static LONG_STOP: AtomicBool = AtomicBool::new(false);

/// The editor's canvas cannot be taller than 32767 px.
const LONG_MAX_H: u32 = 30_000;

/// Runs `f` on the main (window) thread and waits for its result. Never call
/// this from the main thread itself.
fn on_main<R: Send + 'static>(app: &AppHandle, f: impl FnOnce() -> R + Send + 'static) -> Result<R, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let _ = tx.send(f());
    })
    .map_err(err)?;
    rx.recv_timeout(Duration::from_secs(2)).map_err(err)
}

/// Windows calls for the long screenshot.
#[cfg(windows)]
mod long_win {
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::Graphics::Gdi::{CombineRgn, CreateRectRgn, DeleteObject, SetWindowRgn, HGDIOBJ, RGN_DIFF};
    use windows::Win32::UI::Input::KeyboardAndMouse::{SendInput, INPUT, INPUT_0, INPUT_MOUSE, MOUSEEVENTF_WHEEL, MOUSEINPUT};
    use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect, SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE};

    fn hwnd(raw: isize) -> HWND {
        HWND(raw as *mut core::ffi::c_void)
    }

    /// Leaves the window out of screen captures (BitBlt included); it stays
    /// visible on the screen. Needs Windows 10 2004 or later.
    pub fn exclude(raw: isize, on: bool) -> bool {
        let mode = if on { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };
        unsafe { SetWindowDisplayAffinity(hwnd(raw), mode).is_ok() }
    }

    /// Cuts a 3 x 3 pixel hole in the window under the mouse pointer, so the
    /// wheel reaches the window below. The pointer hides the hole. `false`
    /// closes it again.
    pub fn hole(raw: isize, open: bool) {
        let h = hwnd(raw);
        unsafe {
            if !open {
                let _ = SetWindowRgn(h, None, false);
                return;
            }
            let mut p = POINT::default();
            let mut r = RECT::default();
            if GetCursorPos(&mut p).is_err() || GetWindowRect(h, &mut r).is_err() {
                return;
            }
            let (x, y) = (p.x - r.left, p.y - r.top);
            let full = CreateRectRgn(0, 0, r.right - r.left, r.bottom - r.top);
            let cut = CreateRectRgn(x - 1, y - 1, x + 2, y + 2);
            let _ = CombineRgn(Some(full), Some(full), Some(cut), RGN_DIFF);
            let _ = DeleteObject(HGDIOBJ(cut.0));
            let _ = SetWindowRgn(h, Some(full), false); // Windows owns `full` now
        }
    }

    /// Turns the wheel `notches` steps down, as the mouse does.
    pub fn wheel_down(notches: u32) {
        let mi = MOUSEINPUT { mouseData: (-120 * notches as i32) as u32, dwFlags: MOUSEEVENTF_WHEEL, ..Default::default() };
        let input = INPUT { r#type: INPUT_MOUSE, Anonymous: INPUT_0 { mi } };
        unsafe {
            SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        }
    }
}

/// The editor's window handle as a number, which can cross threads.
#[cfg(windows)]
fn raw_hwnd(win: &WebviewWindow) -> Result<isize, String> {
    Ok(win.hwnd().map_err(err)?.0 as isize)
}

/// Grabs the area from the screen. The editor is left out of the capture.
fn grab(origin: (i32, i32), area: [u32; 4]) -> Result<stitch::Frame, String> {
    let mon = xcap::Monitor::from_point(origin.0, origin.1).map_err(err)?;
    let img = mon.capture_region(area[0], area[1], area[2], area[3]).map_err(err)?;
    let (w, h) = img.dimensions();
    Ok(stitch::Frame { w, h, px: img.into_raw() })
}

/// Grabs until two grabs in a row are equal: smooth scrolling has stopped.
fn grab_settled(origin: (i32, i32), area: [u32; 4]) -> Result<stitch::Frame, String> {
    let start = Instant::now();
    std::thread::sleep(Duration::from_millis(80));
    let mut a = grab(origin, area)?;
    loop {
        std::thread::sleep(Duration::from_millis(60));
        let b = grab(origin, area)?;
        if b.px == a.px || start.elapsed() > Duration::from_millis(900) {
            return Ok(b);
        }
        a = b;
    }
}

/// Sends `n` wheel notches to the window below the editor.
#[cfg(windows)]
fn wheel_below(app: &AppHandle, win: &WebviewWindow, n: u32) -> Result<(), String> {
    let raw = raw_hwnd(win)?;
    on_main(app, move || long_win::hole(raw, true))?;
    long_win::wheel_down(n);
    // Windows routes the wheel to the window under the pointer when it takes
    // the input from the queue, a moment after SendInput returns.
    std::thread::sleep(Duration::from_millis(50));
    on_main(app, move || long_win::hole(raw, false))
}

#[cfg(not(windows))]
fn wheel_below(_: &AppHandle, _: &WebviewWindow, _: u32) -> Result<(), String> {
    Err("long screenshots need Windows".into())
}

/// Sends the waiting notches, a few at a time, and stitches each grab.
fn long_worker(app: AppHandle) {
    loop {
        if LONG_STOP.load(Ordering::SeqCst) {
            break;
        }
        let want = LONG_PENDING.swap(0, Ordering::SeqCst);
        if want == 0 {
            LONG_WORKING.store(false, Ordering::SeqCst);
            // A notch may have come in after the swap.
            if LONG_PENDING.load(Ordering::SeqCst) > 0 && !LONG_WORKING.swap(true, Ordering::SeqCst) {
                continue;
            }
            return;
        }
        let job = app.state::<Long>().0.lock().unwrap().as_ref().map(|l| (l.origin, l.area, l.notches()));
        let (Some((origin, area, most)), Some(win)) = (job, overlay(&app)) else { break };
        let n = want.min(most);
        if want > n {
            LONG_PENDING.fetch_add(want - n, Ordering::SeqCst);
        }
        if let Err(e) = wheel_below(&app, &win, n) {
            eprintln!("klik: wheel failed: {e}");
            break;
        }
        let frame = match grab_settled(origin, area) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("klik: grab failed: {e}");
                break;
            }
        };
        let height = {
            let mut guard = app.state::<Long>().0.lock().unwrap();
            let Some(long) = guard.as_mut() else { break };
            if let stitch::Step::Added(d) = long.stitch.push(frame) {
                long.per_notch = Some(d as f64 / n as f64);
            }
            long.stitch.height()
        };
        let _ = win.emit("long-progress", height);
    }
    LONG_WORKING.store(false, Ordering::SeqCst);
}

/// The first wheel step on a selected area: leave the editor out of screen
/// captures and grab the area as it is now. Area in monitor pixels.
#[tauri::command(async)]
fn long_start(app: AppHandle, x: u32, y: u32, w: u32, h: u32) -> Result<(), String> {
    let win = overlay(&app).ok_or("overlay window missing")?;
    let pos = win.outer_position().map_err(err)?;
    let origin = (pos.x, pos.y);
    #[cfg(windows)]
    {
        let raw = raw_hwnd(&win)?;
        if !on_main(&app, move || long_win::exclude(raw, true))? {
            return Err("the editor could not be left out of the capture".into());
        }
        // Let the screen redraw without the editor before the first grab.
        std::thread::sleep(Duration::from_millis(120));
    }
    let first = grab(origin, [x, y, w.max(1), h.max(1)])?;
    LONG_STOP.store(false, Ordering::SeqCst);
    LONG_PENDING.store(0, Ordering::SeqCst);
    *app.state::<Long>().0.lock().unwrap() = Some(LongShot {
        stitch: stitch::Stitcher::new(first, LONG_MAX_H),
        origin,
        area: [x, y, w.max(1), h.max(1)],
        per_notch: None,
    });
    Ok(())
}

/// One or more wheel notches down from the editor.
#[tauri::command]
fn long_step(app: AppHandle, notches: u32) {
    if app.state::<Long>().0.lock().unwrap().is_none() {
        return;
    }
    LONG_PENDING.fetch_add(notches.min(20), Ordering::SeqCst);
    if !LONG_WORKING.swap(true, Ordering::SeqCst) {
        std::thread::spawn(move || long_worker(app));
    }
}

/// The latest grab of the area, for the live view (same format as `get_shot`).
#[tauri::command]
fn long_frame(long: tauri::State<'_, Long>) -> Result<Response, String> {
    let guard = long.0.lock().unwrap();
    let l = guard.as_ref().ok_or("no long screenshot")?;
    Ok(Response::new(shot_bytes(l.area[2], l.area[3], l.stitch.last_frame())))
}

/// Ends the long screenshot: the tall image becomes the capture the editor
/// shows and saves (same format as `get_shot`).
#[tauri::command(async)]
fn long_finish(app: AppHandle) -> Result<Response, String> {
    LONG_STOP.store(true, Ordering::SeqCst);
    let t = Instant::now();
    while LONG_WORKING.load(Ordering::SeqCst) && t.elapsed() < Duration::from_secs(3) {
        std::thread::sleep(Duration::from_millis(20));
    }
    LONG_PENDING.store(0, Ordering::SeqCst);
    let long = app.state::<Long>().0.lock().unwrap().take().ok_or("no long screenshot")?;
    #[cfg(windows)]
    if let Some(win) = overlay(&app) {
        let raw = raw_hwnd(&win)?;
        on_main(&app, move || long_win::exclude(raw, false))?;
    }
    let (w, h, px) = long.stitch.finish();
    let out = shot_bytes(w, h, &px);
    *app.state::<Shot>().0.lock().unwrap() = Some((w, h, px));
    Ok(Response::new(out))
}

/// Drops a long screenshot left running when the editor closes. Runs on the
/// main thread (from `close`), so it calls Windows directly.
fn long_cancel(app: &AppHandle, window: &WebviewWindow) {
    LONG_STOP.store(true, Ordering::SeqCst);
    LONG_PENDING.store(0, Ordering::SeqCst);
    if app.state::<Long>().0.lock().unwrap().take().is_some() {
        #[cfg(windows)]
        if let Ok(raw) = raw_hwnd(window) {
            long_win::exclude(raw, false);
            long_win::hole(raw, false);
        }
    }
    let _ = window;
}

/// Called by the overlay page once it listens for captures.
#[tauri::command]
fn frontend_ready(app: AppHandle) {
    if CAPTURE_ON_READY.swap(false, Ordering::SeqCst) {
        capture_async(&app);
    }
}

#[tauri::command]
fn hotkey_label(hotkey: tauri::State<'_, Hotkey>) -> Option<String> {
    hotkey.0.lock().unwrap().clone()
}

#[tauri::command]
fn show_overlay(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(err)?;
    window.set_always_on_top(true).map_err(err)?;
    let _ = window.set_focus(); // may be refused; Esc works anyway
    grab_escape(&app);
    Ok(())
}

/// Pictures\Klik: the screenshots, plus the Inbox and Studio subfolders.
/// Klik writes nowhere else. Documents is left alone on purpose: on a work PC
/// it is often redirected to a client or project folder.
fn output_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().picture_dir().map_err(err)?.join("Klik");
    std::fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

/// File name for a new capture: `Klik 2026.11.17 19.30 001.png`. The number
/// counts up through the day: one more than the highest number already used
/// by a capture with the same date. `existing` = the file names in the folder.
fn capture_name(existing: impl Iterator<Item = String>, now: chrono::NaiveDateTime) -> String {
    let day = now.format("Klik %Y.%m.%d ").to_string();
    let last = existing
        .filter_map(|n| {
            let stem = n.strip_prefix(day.as_str())?.strip_suffix(".png")?;
            stem.rsplit(' ').next()?.parse::<u32>().ok()
        })
        .max()
        .unwrap_or(0);
    format!("{day}{} {:03}.png", now.format("%H.%M"), last + 1)
}

/// Copies the current image to the clipboard, then saves it as PNG.
/// Body: width, height (u32 LE) + RGBA pixels. Called as soon as an area is
/// selected and again after every marking, so the clipboard always holds what
/// you see. One capture keeps one file, overwritten on each change.
/// Runs off the main thread so the overlay stays responsive.
#[tauri::command(async)]
fn save_copy(app: AppHandle, request: Request<'_>) -> Result<String, String> {
    let InvokeBody::Raw(body) = request.body() else {
        return Err("expected image bytes".into());
    };
    if body.len() < 8 {
        return Err("image too short".into());
    }
    let w = u32::from_le_bytes(body[0..4].try_into().unwrap());
    let h = u32::from_le_bytes(body[4..8].try_into().unwrap());
    let px = &body[8..];
    if px.len() != (w as usize) * (h as usize) * 4 {
        return Err("image size does not match".into());
    }

    let state = app.state::<CurrentFile>();
    let mut current = state.0.lock().unwrap(); // also serialises saves

    // Clipboard first: that is what the user pastes next.
    let mut cb = arboard::Clipboard::new().map_err(err)?;
    cb.set_image(arboard::ImageData {
        width: w as usize,
        height: h as usize,
        bytes: std::borrow::Cow::Borrowed(px),
    })
    .map_err(err)?;

    let path = match current.as_ref() {
        Some(p) => p.clone(),
        None => {
            let dir = output_dir(&app)?;
            let names = std::fs::read_dir(&dir)
                .map_err(err)?
                .flatten()
                .filter_map(|e| e.file_name().into_string().ok());
            let p = dir.join(capture_name(names, chrono::Local::now().naive_local()));
            *current = Some(p.clone());
            p
        }
    };
    let file = std::io::BufWriter::new(std::fs::File::create(&path).map_err(err)?);
    let enc = image::codecs::png::PngEncoder::new_with_quality(
        file,
        image::codecs::png::CompressionType::Fast,
        image::codecs::png::FilterType::Adaptive,
    );
    image::ImageEncoder::write_image(enc, px, w, h, image::ExtendedColorType::Rgba8).map_err(err)?;
    Ok(path.to_string_lossy().into_owned())
}

/// Hides the overlay. `discard` deletes the file saved for this capture, or,
/// for a screenshot reopened from Studio, puts the original back.
#[tauri::command]
fn close(app: AppHandle, window: WebviewWindow, discard: bool) -> Result<(), String> {
    release_escape(&app);
    long_cancel(&app, &window);
    window.hide().map_err(err)?;
    if RETURN_TO_STUDIO.swap(false, Ordering::SeqCst) {
        open_studio(&app);
    }
    app.state::<Shot>().0.lock().unwrap().take();
    let editing = app.state::<Editing>().0.lock().unwrap().take();
    if let Some(p) = app.state::<CurrentFile>().0.lock().unwrap().take() {
        match (discard, editing) {
            (true, Some((orig, bytes))) if orig == p => {
                std::fs::write(&p, bytes).map_err(err)?;
                announce_saved(&app, &p);
            }
            (true, _) => {
                let _ = std::fs::remove_file(p);
            }
            (false, _) => announce_saved(&app, &p),
        }
    }
    Ok(())
}

/// The editor's Studio button: hide the overlay, open Klik Studio and add the
/// screenshot just saved as a slide. The file is kept, as with `close`.
#[tauri::command]
fn close_to_studio(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    release_escape(&app);
    long_cancel(&app, &window);
    window.hide().map_err(err)?;
    RETURN_TO_STUDIO.store(false, Ordering::SeqCst);
    app.state::<Shot>().0.lock().unwrap().take();
    app.state::<Editing>().0.lock().unwrap().take();
    let saved = app.state::<CurrentFile>().0.lock().unwrap().take();
    if let Some(p) = &saved {
        announce_saved(&app, p);
    }
    open_studio(&app);
    if let Some(name) = saved.as_ref().and_then(|p| p.file_name()).and_then(|n| n.to_str()) {
        app.emit_to(STUDIO, "add-shot", name).map_err(err)?;
    }
    Ok(())
}

/// The handoff inbox shared with Claude through klik-mcp (same default path).
fn inbox_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = match std::env::var("KLIK_INBOX_DIR") {
        Ok(v) if !v.trim().is_empty() => PathBuf::from(v.trim()),
        _ => output_dir(app)?.join("Inbox"),
    };
    std::fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

fn open_dir(dir: Result<PathBuf, String>) {
    if let Ok(dir) = dir {
        #[cfg(windows)]
        let _ = std::process::Command::new("explorer").arg(dir).spawn();
        #[cfg(not(windows))]
        let _ = std::process::Command::new("xdg-open").arg(dir).spawn();
    }
}

// ---------- Klik Studio ----------
// Studio only reads Pictures\Klik and the handoff inbox, and only writes to
// Pictures\Klik\Studio. Every name it sends is checked by `safe_name`.

/// A screenshot in Pictures\Klik.
#[derive(serde::Serialize)]
struct Capture {
    name: String,
    /// Last change, milliseconds since 1970.
    modified: u64,
}

fn modified_ms(entry: &std::fs::DirEntry) -> u64 {
    entry
        .metadata()
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// The newest 60 PNG files in Pictures\Klik, newest first.
#[tauri::command]
fn list_captures(app: AppHandle) -> Result<Vec<Capture>, String> {
    let dir = output_dir(&app)?;
    let mut out = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(err)?.flatten() {
        let path = entry.path();
        let is_png = path.extension().and_then(|e| e.to_str()).is_some_and(|e| e.eq_ignore_ascii_case("png"));
        if !is_png || !path.is_file() {
            continue;
        }
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            out.push(Capture { name: name.to_string(), modified: modified_ms(&entry) });
        }
    }
    out.sort_by(|a, b| b.modified.cmp(&a.modified));
    out.truncate(60);
    Ok(out)
}

/// A plain file name, never a path, so Studio can only reach its own folders.
fn safe_name(name: &str) -> Result<&str, String> {
    let n = name.trim();
    if n.is_empty() || n.starts_with('.') || n.contains(['/', '\\', ':']) || n.contains("..") {
        return Err("invalid file name".into());
    }
    Ok(n)
}

/// PNG bytes of one screenshot in Pictures\Klik.
#[tauri::command(async)]
fn read_capture(app: AppHandle, name: String) -> Result<Response, String> {
    let path = output_dir(&app)?.join(safe_name(&name)?);
    Ok(Response::new(std::fs::read(path).map_err(err)?))
}

/// Pictures\Klik\Studio, where carousels and slides are exported.
fn exports_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = output_dir(app)?.join("Studio");
    std::fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(Ok(v)) = s.get(i + 1..i + 3).map(|h| u8::from_str_radix(h, 16)) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn header(request: &Request<'_>, key: &str) -> Result<String, String> {
    let v = request.headers().get(key).ok_or(format!("missing {key}"))?;
    Ok(percent_decode(v.to_str().map_err(err)?))
}

/// Writes one export file. Body: the file bytes. Headers: x-folder, x-file
/// (URI-encoded plain names). Returns the export folder path.
#[tauri::command(async)]
fn save_export(app: AppHandle, request: Request<'_>) -> Result<String, String> {
    let InvokeBody::Raw(body) = request.body() else {
        return Err("expected file bytes".into());
    };
    let folder = header(&request, "x-folder")?;
    let file = header(&request, "x-file")?;
    let dir = exports_dir(&app)?.join(safe_name(&folder)?);
    std::fs::create_dir_all(&dir).map_err(err)?;
    std::fs::write(dir.join(safe_name(&file)?), body).map_err(err)?;
    Ok(dir.to_string_lossy().into_owned())
}

/// Opens an export folder (a path returned by `save_export`) in Explorer.
#[tauri::command]
fn open_exports(app: AppHandle, folder: String) -> Result<(), String> {
    let root = exports_dir(&app)?;
    let path = PathBuf::from(&folder);
    let target = if path.starts_with(&root) { path } else { root };
    open_dir(Ok(target));
    Ok(())
}

/// A deck Claude wrote into the handoff inbox (via klik-mcp `handoff_write`)
/// as a fenced ```klik-deck JSON block. Studio only reads it; the person
/// reviews and exports.
#[derive(serde::Serialize)]
struct ClaudeDraft {
    file: String,
    title: String,
    modified: u64,
    deck: String,
}

fn deck_block(md: &str) -> Option<String> {
    let start = md.find("```klik-deck")?;
    let rest = &md[start + "```klik-deck".len()..];
    let end = rest.find("```")?;
    Some(rest[..end].trim().to_string())
}

fn front_title(md: &str) -> Option<String> {
    let body = md.strip_prefix("---\n").or_else(|| md.strip_prefix("---\r\n"))?;
    let fm = &body[..body.find("\n---")?];
    fm.lines()
        .find_map(|l| l.strip_prefix("title:"))
        .map(|t| t.trim().trim_matches('"').to_string())
}

/// Claude drafts in the handoff inbox, newest first.
#[tauri::command]
fn list_claude_drafts(app: AppHandle) -> Result<Vec<ClaudeDraft>, String> {
    let dir = inbox_dir(&app)?;
    let mut out = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(err)?.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let Ok(md) = std::fs::read_to_string(&path) else { continue };
        let Some(deck) = deck_block(&md) else { continue };
        let file = path.file_name().and_then(|n| n.to_str()).unwrap_or_default().to_string();
        let title = front_title(&md).unwrap_or_else(|| file.trim_end_matches(".md").to_string());
        out.push(ClaudeDraft { file, title, modified: modified_ms(&entry), deck });
    }
    out.sort_by(|a, b| b.modified.cmp(&a.modified));
    out.truncate(20);
    Ok(out)
}

/// Studio's Screenshot button: hide Studio so it is not in the picture, take
/// the screenshot, and bring Studio back when the editor closes.
#[tauri::command]
fn studio_capture(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(err)?;
    RETURN_TO_STUDIO.store(true, Ordering::SeqCst);
    std::thread::spawn(move || {
        // Let Windows finish hiding the window before the monitor is grabbed.
        std::thread::sleep(std::time::Duration::from_millis(250));
        if let Err(e) = capture(&app) {
            eprintln!("klik: capture failed: {e}");
            RETURN_TO_STUDIO.store(false, Ordering::SeqCst);
            open_studio(&app);
        }
    });
    Ok(())
}

/// What a start of `klik.exe` asks for: `--shot` a screenshot, `--background`
/// nothing (start at login), anything else Klik Studio.
#[derive(Debug, Clone, Copy, PartialEq)]
enum Launch {
    Shot,
    Quiet,
    Studio,
}

fn launch_kind<S: AsRef<str>>(args: &[S]) -> Launch {
    if args.iter().any(|a| a.as_ref() == "--shot") {
        Launch::Shot
    } else if args.iter().any(|a| a.as_ref() == "--background") {
        Launch::Quiet
    } else {
        Launch::Studio
    }
}

/// Right-click on the Klik icon in the taskbar: "Take screenshot" and
/// "Klik Studio", so neither needs the hotkey. Works while Klik is closed too.
#[cfg(windows)]
fn set_jump_list(da: bool) -> windows::core::Result<()> {
    use windows::core::{Interface, HSTRING};
    use windows::Win32::Storage::EnhancedStorage::PKEY_Title;
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemAlloc, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};
    use windows::Win32::UI::Shell::Common::{IObjectArray, IObjectCollection};
    use windows::Win32::UI::Shell::PropertiesSystem::IPropertyStore;
    use windows::Win32::UI::Shell::{DestinationList, EnumerableObjectCollection, ICustomDestinationList, IShellLinkW, ShellLink};

    /// A PROPVARIANT holding a VT_LPWSTR, laid out by hand (24 bytes on x64).
    #[repr(C)]
    struct LpwstrVariant {
        vt: u16,
        reserved: [u16; 3],
        text: *mut u16,
        pad: usize,
    }

    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let exe = HSTRING::from(std::env::current_exe().unwrap_or_default().as_os_str());
        let list: ICustomDestinationList = CoCreateInstance(&DestinationList, None, CLSCTX_INPROC_SERVER)?;
        list.SetAppID(&HSTRING::from(APP_ID))?;
        let mut slots = 0u32;
        let _removed: IObjectArray = list.BeginList(&mut slots)?;
        let tasks: IObjectCollection = CoCreateInstance(&EnumerableObjectCollection, None, CLSCTX_INPROC_SERVER)?;
        let items = [
            ("--shot", if da { "Tag screenshot" } else { "Take screenshot" }),
            ("--studio", "Klik Studio"),
        ];
        for (arg, title) in items {
            let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
            link.SetPath(&exe)?;
            link.SetArguments(&HSTRING::from(arg))?;
            link.SetIconLocation(&exe, 0)?;
            // The title goes in COM memory; the shell copies it. A few bytes
            // are left allocated once per start, which is harmless.
            let wide: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();
            let text = CoTaskMemAlloc(wide.len() * 2) as *mut u16;
            if text.is_null() {
                continue;
            }
            std::ptr::copy_nonoverlapping(wide.as_ptr(), text, wide.len());
            let value = LpwstrVariant { vt: 31, reserved: [0; 3], text, pad: 0 }; // 31 = VT_LPWSTR
            let store: IPropertyStore = link.cast()?;
            store.SetValue(&PKEY_Title, &value as *const LpwstrVariant as *const _)?;
            store.Commit()?;
            tasks.AddObject(&link)?;
        }
        let array: IObjectArray = tasks.cast()?;
        list.AddUserTasks(&array)?;
        list.CommitList()?;
    }
    Ok(())
}

#[cfg(windows)]
fn set_app_id() {
    use windows::core::HSTRING;
    unsafe {
        let _ = windows::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID(&HSTRING::from(APP_ID));
    }
}

fn open_studio(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(STUDIO) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[cfg(test)]
mod studio_tests {
    use super::*;

    #[test]
    fn launch_args_pick_shot_studio_or_quiet() {
        assert_eq!(launch_kind(&["klik.exe"]), Launch::Studio);
        assert_eq!(launch_kind(&["klik.exe", "--studio"]), Launch::Studio);
        assert_eq!(launch_kind(&["klik.exe", "--shot"]), Launch::Shot);
        assert_eq!(launch_kind(&["klik.exe", "--background"]), Launch::Quiet);
    }

    #[test]
    fn safe_name_blocks_paths() {
        for bad in ["", ".", "..", "../x.png", "a/b.png", "a\\b.png", "C:x.png", ".hidden", "x..png"] {
            assert!(safe_name(bad).is_err(), "{bad}");
        }
        assert_eq!(safe_name(" Klik 2026-11-17 101500.png ").unwrap(), "Klik 2026-11-17 101500.png");
        assert_eq!(safe_name("Klik 2026.11.17 19.30 001.png").unwrap(), "Klik 2026.11.17 19.30 001.png");
    }

    #[test]
    fn reopened_screenshot_sits_centred_on_the_backdrop() {
        let img = image::RgbaImage::from_pixel(4, 2, image::Rgba([200, 30, 30, 255]));
        let (px, sel) = compose(10, 6, &img).unwrap();
        assert_eq!(sel, [3, 2, 4, 2]);
        assert_eq!(px.len(), 10 * 6 * 4);
        let at = |x: usize, y: usize| &px[(y * 10 + x) * 4..(y * 10 + x) * 4 + 4];
        assert_eq!(at(0, 0), BACKDROP);
        assert_eq!(at(3, 2), [200, 30, 30, 255]);
        assert_eq!(at(6, 3), [200, 30, 30, 255]);
        assert_eq!(at(7, 3), BACKDROP);
        assert!(compose(3, 6, &img).is_err(), "wider than the screen");
    }

    #[test]
    fn capture_names_count_up_through_the_day() {
        let at = |h, m| chrono::NaiveDate::from_ymd_opt(2026, 11, 17).unwrap().and_hms_opt(h, m, 5).unwrap();
        let names = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>().into_iter();

        assert_eq!(capture_name(names(&[]), at(9, 5)), "Klik 2026.11.17 09.05 001.png");
        // Yesterday's files and the old name format do not count.
        let old = ["Klik 2026.11.16 23.59 007.png", "Klik 2026-11-17 101500.png", "notes.txt"];
        assert_eq!(capture_name(names(&old), at(9, 5)), "Klik 2026.11.17 09.05 001.png");
        // One more than the highest number today, also after a deleted capture.
        let today = ["Klik 2026.11.17 09.05 001.png", "Klik 2026.11.17 09.06 003.png"];
        assert_eq!(capture_name(names(&today), at(19, 30)), "Klik 2026.11.17 19.30 004.png");
    }

    #[test]
    fn reads_deck_block_and_title() {
        let md = "---\ntitle: \"Klik deck: one owner\"\ncreated: x\n---\n\nIntro\n```klik-deck\n{\"slides\":[]}\n```\n";
        assert_eq!(deck_block(md).as_deref(), Some("{\"slides\":[]}"));
        assert_eq!(front_title(md).as_deref(), Some("Klik deck: one owner"));
        assert!(deck_block("no deck here").is_none());
    }

    #[test]
    fn decodes_percent_names() {
        assert_eq!(percent_decode("2026-11-17%201015%20Post%204x5"), "2026-11-17 1015 Post 4x5");
        assert_eq!(percent_decode("Pr%C3%A6sentation.pdf"), "Præsentation.pdf");
    }
}

/// English, or Danish when Windows runs in Danish.
fn danish() -> bool {
    sys_locale::get_locale().is_some_and(|l| l.to_lowercase().starts_with("da"))
}

fn setup_tray(app: &AppHandle, hotkey: Option<&str>) -> tauri::Result<()> {
    let da = danish();
    let tr = |en: &str, dk: &str| if da { dk.to_string() } else { en.to_string() };
    let shot_label = match hotkey {
        Some(k) => format!("{}   ({k})", tr("Take screenshot", "Tag screenshot")),
        None => tr("Take screenshot", "Tag screenshot"),
    };
    let key_label = match hotkey {
        Some(k) => format!("{}: {k}", tr("Hotkey", "Genvejstast")),
        None => tr("No free hotkey. Click the icon instead", "Ingen ledig genvejstast. Klik på ikonet i stedet"),
    };
    let shot = MenuItem::with_id(app, "shot", shot_label, true, None::<&str>)?;
    let key = MenuItem::with_id(app, "key", key_label, false, None::<&str>)?;
    let folder = MenuItem::with_id(app, "folder", tr("Open screenshots", "Åbn screenshots"), true, None::<&str>)?;
    let inbox = MenuItem::with_id(app, "inbox", tr("Open inbox (Claude)", "Åbn indbakke (Claude)"), true, None::<&str>)?;
    let studio = MenuItem::with_id(app, "studio", tr("Klik Studio: make a carousel or slides", "Klik Studio: lav karrusel eller præsentation"), true, None::<&str>)?;
    let exports = MenuItem::with_id(app, "exports", tr("Open Studio exports", "Åbn Studio-eksporter"), true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", tr("Quit Klik", "Afslut Klik"), true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&shot, &key, &sep2, &studio, &exports, &folder, &inbox, &sep, &quit])?;
    // Left-click opens Studio: screenshots start from the hotkey, so the icon
    // is the way into Studio. Right-click shows the menu, screenshot included.
    let tooltip = match hotkey {
        Some(k) => format!("Klik  -  {}  ·  {k}: {}", tr("click for Studio", "klik for Studio"), tr("screenshot", "screenshot")),
        None => format!("Klik  -  {}", tr("click for Studio, right-click for a screenshot", "klik for Studio, højreklik for screenshot")),
    };

    TrayIconBuilder::with_id("klik")
        .icon(app.default_window_icon().cloned().expect("app icon"))
        .tooltip(tooltip)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id.as_ref() {
            "shot" => capture_async(app),
            "folder" => open_dir(output_dir(app)),
            "inbox" => open_dir(inbox_dir(app)),
            "studio" => open_studio(app),
            "exports" => open_dir(exports_dir(app)),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, e| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = e
            {
                open_studio(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Started from the Start menu or the taskbar icon: Klik Studio, where the
    // gallery and a Screenshot button are. `--shot` (the jump list) takes a
    // screenshot. Started at login (`--background`) stays quiet.
    let args: Vec<String> = std::env::args().collect();
    let first = launch_kind(&args);
    CAPTURE_ON_READY.store(first == Launch::Shot, Ordering::SeqCst);
    #[cfg(windows)]
    set_app_id();

    tauri::Builder::default()
        // A second launch asks the running Klik for a screenshot or Studio.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| match launch_kind(&args) {
            Launch::Shot => capture_async(app),
            Launch::Studio => open_studio(app),
            Launch::Quiet => {}
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if *shortcut == escape_key() {
                        // The editor decides: finish a comment, close, or discard.
                        if let Some(w) = overlay(app) {
                            let _ = w.emit("escape", ());
                        }
                    } else {
                        capture_async(app);
                    }
                })
                .build(),
        )
        .manage(Shot::default())
        .manage(Hotkey::default())
        .manage(CurrentFile::default())
        .manage(Editing::default())
        .manage(Long::default())
        .invoke_handler(tauri::generate_handler![
            get_shot,
            show_overlay,
            save_copy,
            close,
            close_to_studio,
            studio_capture,
            edit_capture,
            frontend_ready,
            hotkey_label,
            list_captures,
            read_capture,
            save_export,
            open_exports,
            list_claude_drafts,
            long_start,
            long_step,
            long_frame,
            long_finish
        ])
        .setup(move |app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            // Take the first hotkey that no other program (e.g. Snagit) owns.
            let mut got = None;
            for (s, label) in hotkey_candidates() {
                match app.global_shortcut().register(s) {
                    Ok(()) => {
                        got = Some(label);
                        break;
                    }
                    Err(e) => eprintln!("klik: {label} is taken: {e}"),
                }
            }
            *app.state::<Hotkey>().0.lock().unwrap() = got.map(String::from);
            setup_tray(app.handle(), got)?;
            #[cfg(windows)]
            std::thread::spawn(|| {
                if let Err(e) = set_jump_list(danish()) {
                    eprintln!("klik: jump list failed: {e}");
                }
            });
            if first == Launch::Studio {
                open_studio(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Never close the overlay; hide it so the tray app keeps running.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Klik");
}

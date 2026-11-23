# Klik: product specification

Version 0.11, 2026.11.18. Owner: Henning Kristensen (RTPM).
The name Klik is decided (2026.11.17).

This spec records Henning's wishes for a simple screen capture tool that covers the most-used Snagit features with far fewer clicks. Each requirement says where it stands: **Built** (code exists and was tested in a browser, not yet on Windows), **Planned**, or **Open** (a decision is still needed). What comes next is in `ROADMAP.md`.

## 1. Purpose

Snagit can do a lot, but it has too many buttons and too many clicks per task. Klik keeps only what Henning uses and makes each task as short as possible:

- screenshots with markings, ready to paste
- long scrolling screenshots
- step-by-step guides made from clicks
- screen videos with a visible cursor, voice-over and webcam: demo videos made in the same tool
- Claude writes the text for the steps
- Claude can read Klik's captures and a shared inbox directly, so results move between AI sessions without copy-paste

**Users:** Henning first, then the RTPM team. Possibly external buyers later (see open question Q1).

## 2. Design principles

1. **One hotkey, no dialogs.** Every capture starts from one key. No "save as" windows, no setup screens.
2. **The editor opens by itself** after a capture, with a drawing tool already selected.
3. **Esc means done.** Esc saves the result and puts it on the clipboard, ready to paste wherever you are.
4. **Few tools, all visible.** No menus and no hidden panels. One drag or click per marking.
5. **Looks calm and modern.** One dark, glass-style toolbar that appears next to the selection. A single accent colour.
6. **Local by default.** Files stay on the PC. Nothing goes to the cloud or to AI unless the user asks for it in that capture.
7. **A standalone app.** Klik is installed on the PC and runs on its own. It needs no browser, browser extension or other program to be open. (Its window is drawn with WebView2, a component built into Windows 11, not a browser you run.)

### Brand

Klik follows the RTPM product UI rules in `038-KNW-Universal brand color font and logo system` v1.0, sections 6-7. That file is the source. Do not copy its values elsewhere without checking it first.

- Font: Inter only (bundled with the app).
- Calm and light: white toolbar and hint, border `#e6e6f0`, text `#15162b`.
- Active tool: Primary Indigo `#0d08d2`. One primary action per screen: "Kopiér" in Accent Yellow `#ffcc00`.
- Marking colours: red `#C0392B`, indigo `#0d08d2`, green `#27AE60`, yellow `#ffcc00` (highlighter), ink `#15162b`. Numbered arrows default to indigo, pen and line to red.
- App icon: the RTPM app icon, white mark on Ink Navy `#070474` (Henning 2026.11.18, 0.2.5; replaces the blue Klik icon of 0.2.4), so Klik is recognisably RTPM's. Source: `app/src-tauri/icons/app-icon.png`, a copy of `rtpm-appicon-1024.png` from RTPM's brand system; regenerate the set with `npx tauri icon src-tauri/icons/app-icon.png -o src-tauri/icons` in `app` and delete the `android` and `ios` folders it adds. Windows caches taskbar icons, so a pinned Klik icon can keep the old look until Windows refreshes it.
- Sentence case in all UI text.
- Installer publisher: Real Time Project Management.

## 3. Functional requirements

Priority: **Must** = MVP, **Should** = next release, **Could** = later.

### F1. Screenshot: Must, Built

- `Ctrl+Alt+K`, "Take screenshot" in the taskbar icon's right-click list or the tray menu, or "New screenshot" in Studio freezes the monitor under the mouse. Opening Klik from the Start menu or the taskbar icon opens Klik Studio instead (0.2.5). If another program owns that key, Klik takes the first free one of `Ctrl+Shift+K`, `Ctrl+Alt+S`, `Ctrl+Shift+X` and shows it in the tray menu. `PrtScn` is left to Snagit and the Snipping Tool.
- Drag to select an area, or click once to take the whole screen.
- The selection shows its size in pixels.
- Right-click starts the selection again.
- **Accept when:** the area goes from hotkey to selected in one drag, and the saved image is pixel-sharp at the monitor's own resolution on 100 % and 150 % scaling.

### F2. Editor opens automatically: Must, Built

- After the selection, the editor appears on top of the frozen screen with no extra click.
- The **highlighter (marker) is selected by default**, so marking can start straight away.
- **Accept when:** the first drag after selecting an area draws a highlight.

### F3. Annotation tools: Must, Built

| Tool | Key | Behaviour |
|---|---|---|
| Highlighter | `M` | Semi-transparent yellow marker. Text underneath stays readable. Default tool. |
| Arrow with number | `A` | Drag draws an arrow with a numbered badge (1, 2, 3 …) at its start. The number counts up by itself. A click without dragging gives only the badge. |
| Arrow with comment | `K` | Drag from where the comment should sit to what it points at. A text field opens there; type, then Enter (or Esc, or a click elsewhere) to finish. Shift+Enter gives a new line. A click without dragging gives only the comment box. 15 px Inter in a white box with a coloured border, wrapping at 280 px. An empty comment is removed. |
| Freehand pen | `P` | Smooth freehand line. |
| Line | `L` | Straight line. |

- 5 colours: red, yellow, green, blue, black. The colour belongs to the selected tool.
- `Shift` while drawing with the pen or highlighter gives a straight stroke.
- `Ctrl+Z` undoes the last marking.
- **Accept when:** a screenshot with the steps "1, 2, 3" takes one drag to select plus three drags to mark.

### F4. Copied as soon as it is framed: Must, Built

- The moment the area is selected (the second click or the end of the drag), the image is on the clipboard and saved as PNG in `Pictures\Klik\`. No button, no Esc needed.
- Every marking and every undo updates the clipboard and the same file within about 0.2 seconds. The toolbar shows "Kopieret".
- `Esc`, `Enter` or "Færdig" only closes. The ✕ button deletes the file and closes.
- Esc before anything is selected cancels without saving.
- Esc works even when the editor did not get the keyboard (Built, 0.2.6, untested on Windows). Windows can refuse focus to a window that opens while another program is in front; Klik then catches Esc itself while the editor is open. The hotkey pressed while the editor is open brings it forward instead of being ignored. Reason: Henning's editor stayed open behind other windows and no new screenshots were saved (2026.11.18).
- **Accept when:** selecting an area and pressing `Ctrl+V` in Teams pastes it with no other key; after adding arrows, `Ctrl+V` pastes the marked version.

### F5. Scrolling capture: Must, Planned

- One hotkey, then one click in the window to capture. Klik scrolls by itself and stitches one long image.
- If automatic scrolling fails, a fallback mode lets the user scroll by hand while Klik stitches.
- The result opens in the same editor (F2–F4).
- **Accept when:** a long page in Chrome, Outlook and SharePoint comes out as one image with no visible seams or repeated headers.

### F6. Step capture: Must, Planned

- One hotkey starts step recording. **Every mouse click takes a new screenshot**, with a red ring where the click happened. The same hotkey stops it.
- After stopping, the steps appear as a numbered list. The user can delete or reorder steps and annotate each one with the F3 tools.
- **Accept when:** 10 clicks give 10 numbered steps, ready less than 2 seconds after stopping.

### F7. Screen video with a visible cursor: Should, Planned

- One hotkey, select an area or the whole screen, and the same hotkey stops recording.
- An **indigo ring follows the cursor** (2 px `#0D08D2` with a light indigo halo `#E7E6FA`, never gold), and each click shows a short ripple, so viewers see where you point. Decided by Henning 2026.11.16 to match the RTPM brand guide.
- Output is MP4 that plays in Teams and PowerPoint.
- **Accept when:** a 2-minute recording has a visible cursor ring and a click ripple at every click, and plays in both apps.

### F8. Demo video: voice-over and webcam: Should, Planned

- Record the microphone while recording the screen (F7) or the steps (F6).
- Optional webcam of the presenter shown **in a circle** in a corner of the video. It can be moved and switched off.
- The aim is a complete demo video made in Klik, with no separate video tool.
- **Accept when:** one recording gives an MP4 with screen, cursor ring, voice and webcam circle, in sync.

### F9. Claude writes the step text: Should, Planned

- From a step capture (F6), Claude writes a short instruction for each step. It uses the screenshot, what was clicked (for example the button label), and what the user said during recording (F8).
- The user reviews and edits the text before export.
- **Privacy:** AI is used only when the user presses "Write steps" on that guide. Screenshots of client systems are sent only with the client's permission. Text and images are not kept by Klik outside the user's own folder.
- **Accept when:** a 10-step guide needs no hand-written text, only light edits.

### F10. Export: Must for PNG, Should for the rest, Planned

| Output | From | Format |
|---|---|---|
| Image | F1, F5 | PNG (Built) |
| Guide | F6 + F9 | Word, PowerPoint (one slide per step), Markdown |
| Video | F7, F8 | MP4 |
| Step video | F6 + F8 + F9 | MP4 with one segment per step |

### F11. Always ready: Must, partly Built

- Klik runs in the system tray. Left-click opens Klik Studio (Built, 0.2.4): screenshots start from the hotkey, so the icon is the way into Studio. The tooltip names both. The right-click menu has "Take screenshot", Studio, the folders and "Quit" (Built).
- Taskbar icon (Built, 0.2.5, untested on Windows): a click opens Klik Studio. Right-click shows a jump list with "Take screenshot" (`klik.exe --shot`) and "Klik Studio" (`--studio`), which works while Klik is closed too. Reason: users who do not know the hotkey must reach both, and Studio must open without a screenshot first (Henning 2026.11.18).
- Not built: a window with the two choices on mouse-over. A pinned icon with no open window gives Klik no hover event, and Windows' own preview shows only for open windows, after its own delay. A window that opens on hover would also pop up by accident.
- Starts with Windows (Planned).
- Only one copy runs at a time. Starting it again triggers a capture (Built).

### F12. Distribution: Open

| Channel | Status |
|---|---|
| Windows installer built by GitHub Actions, published as a GitHub Release on each version tag, current user only, no admin rights | Built. First build succeeded 2026.11.13; installer not yet tried on a PC |
| Microsoft Store (free registration, Microsoft signs the app, no SmartScreen warning) | Planned. Tauri does not produce MSIX by itself; the packaging step is not yet tested. |
| Chrome Web Store browser extension | **Dropped** 2026.11.15: Klik is a standalone desktop app |

### F13. Claude can read Klik (MCP server): Should, Built

Klik ships a small local MCP server (`klik-mcp.exe`), so Claude can use Klik's output without the user pasting it.

| Tool | What Claude gets |
|---|---|
| `klik_latest` | The newest capture: image, time, file path |
| `klik_list` | Recent captures, guides and videos, newest first |
| `klik_get` | One capture as an image, or one guide as step text plus images |
| `klik_screenshot` (Could, Planned) | A new screenshot of the screen under the mouse. Klik shows a visible notice when it happens. |

- Read-only by default. It reads Klik's own folders and works even when the Klik app is closed.
- Status: the first five tools are built and tested with an MCP client (two separate sessions) on Linux. Not yet tested on Windows or in Claude Desktop.
- **Accept when:** in Claude Desktop, "What does my latest screenshot show?" gets an answer with no pasting.

### F14. Handoff inbox between AI sessions: Should, Built

The problem: a result from one AI session (chat, Project, Claude Code) is copied by hand into the next session. Klik becomes the shared place in between.

| Tool | Use |
|---|---|
| `handoff_write` | A session stores a result or handoff brief (title, Markdown text, optionally the latest capture) |
| `handoff_list` | Lists the inbox, newest first |
| `handoff_read` | The next session reads a handoff in full |

- Stored as plain Markdown and image files in `Pictures\Klik\Inbox\`, so people and other tools can read them too.
- The tray menu opens the inbox folder (Built). Showing the count is Planned.
- Henning's `session-handoff` skill writes its brief to the inbox when Klik is connected, instead of a copy-paste block. The skill change is proposed; Henning approves it (not changed yet).
- (Could) A hotkey saves the clipboard text to the inbox, for AI tools without MCP.
- **Accept when:** session A writes a handoff, and session B (in another Claude surface) continues from it after one short prompt, with no copy-paste.

**Where it works.** A local MCP server is only reachable from programs on the same PC.

| Claude surface | Works? |
|---|---|
| Claude Desktop (chats, Projects) | Yes. Installed by double-clicking a `.mcpb` file. |
| Claude Code on the PC | Yes. `claude mcp add` |
| claude.ai in a browser, the phone app, Claude Code in the cloud | No, they cannot reach the PC. Possible bridge (Could, not tested): keep the inbox in a OneDrive or Google Drive folder and read it with the existing Microsoft 365 or Google Drive connectors. A remote MCP server in RTPM's own cloud is a later option, but then data leaves the PC. |

### F15. LinkedIn posts from a recording: Could, Planned

Klik turns one rough demo recording (F6, F7, F8) into finished LinkedIn content, so a new build can be shown the same day without a separate video or design tool. Part of Klik and Klik Studio (F16), not a separate app.

**Flow:** record as usual, press "Make post" in Studio, review the edit plan, export.

1. **Event log while recording.** F6 and F7 also save `events.json`: every click and key with timestamp, screen position and, where Windows UI Automation gives it, the button or field name. Claude can then understand a recording without watching all of it.
2. **Local transcript.** Speech from F8 becomes text with timestamps on the PC (for example whisper.cpp). No audio leaves the PC for this step.
3. **AI edit plan.** Only when the user presses the button, Claude reads `events.json`, the transcript and a few keyframes and returns `edit.json`: cuts, zoom-ins on clicks, captions, a hook line and a short storyboard. The user reviews it in a simple timeline. The original recording is never changed.
4. **Voice (optional).** Keep the user's own cleaned-up voice, or let a cloned voice read the approved script: only the user's own voice, with recorded consent, and the post says the voice is AI-generated.
5. **Render.** A bundled FFmpeg sidecar renders the plan with the Studio brand overlays: hook card, burned-in captions, lower third and end card.
6. **Images and documents.** Step screenshots (F6) become a Studio carousel or slides (F16).

| Output | Size | Use |
|---|---|---|
| Feed video | 1080 × 1350 (4:5), MP4 | Default LinkedIn video |
| Vertical video | 1080 × 1920 (9:16), MP4 | Short clips for the vertical feed |
| Wide video | 1920 × 1080 (16:9), MP4 | Website, YouTube, presentations. Its own layout, never a crop of 4:5 |

- **Privacy:** as F9. AI and voice services run only when the user presses the button for that recording. Recordings of client systems go to Claude only with the client's permission. Everything else stays in `Videos\Klik\`.
- **Accept when:** a 2-minute rough recording becomes a captioned 4:5 MP4 with hook and end card after one press and light edits only.

### F16. Klik Studio: carousels and slides from screenshots: Should, Built

A second window of Klik, ported from the separate Klik Content app (old repo, PR #4 and #5) so all of Klik is one app and one installer. Requirement numbers S1 to S7 carry over Klik Content's C1 to C8.

**S1. One app (was C1, "separate app"): Built.** Studio is a window of Klik. It reuses Klik's screenshot folder `Pictures\Klik`, the MCP server (F13) and the handoff inbox (F14). Two ways in:
- From the editor (Built, 0.2.2): the "Studio" button (key `S`, shown in its tooltip only, so the button stays short) next to "Done" closes the editor, opens Studio and adds the screenshot just taken, with its markings, as a new slide. One click. The button is white, so "Done" stays the one yellow action, and it is never needed in the normal capture flow, so the click budget for tasks 1 and 2 (section 4) is unchanged. Reason for the new button: Windows hides new tray icons, so the only other way in took three clicks on a hidden icon (found in Henning's test 2026.11.17).
- From the tray icon: left-click (0.2.4), or "Klik Studio" in the right-click menu, to work on a deck without a new screenshot. One click.
- From the taskbar or Start menu (0.2.5): a click on the Klik icon opens Studio. One click.
- Studio's "New screenshot" button above the gallery (Built, 0.2.5): Studio hides, the editor opens on the monitor under the mouse, and Studio comes back when the editor closes, with the new screenshot in the gallery. White, so Export stays the one yellow action. Reason: a screenshot without the hotkey.

**S1a. Gallery with re-edit: Built (0.2.3).** Studio's screenshot gallery (newest 60 in `Pictures\Klik`) has two actions per screenshot, each one click: click the picture to add it as a slide, or click the pencil to reopen it in the editor. The reopened screenshot sits in the middle of an ink backdrop, already selected, so the next drag marks it. Every change saves over the same file and Studio redraws the slides that use it. ✕ puts the original back instead of deleting the file. Markings already in a file are part of the picture: new ones go on top, old ones cannot be moved or removed. Henning asked for a chooser after the Studio button (deck or gallery); it was left out because it costs an extra click on the most common path, and the gallery gives both choices inside Studio (decided 2026.11.17).

**S2a. Slide overview: Built (0.2.7, browser-tested; drag fixed in 0.2.8).** The slide list shows small drawings of the real slides (three per row for 4:5, two for 16:9) instead of text rows, because 30 rows of "[What this screen shows]" could not be told apart (Henning 2026.11.22). Drag a slide to change the order; `Alt`+arrow moves the selected one, arrows select. `Del` or the x on a slide deletes it at once, and the note offers Undo for 8 seconds instead of asking first. A screenshot already in the deck carries its slide number in the gallery, and clicking it selects that slide instead of adding a copy. "Other slides need fixing" lists slide numbers you can click. The up, down and Delete buttons are gone. 0.2.8: the Studio window turns off Tauri's own file drop (`dragDropEnabled: false`), which on Windows swallowed the drag (Windows test 2026.11.22); untested on Windows.

**S2b. Highlight by clicking words: Built (0.2.7, browser-tested).** The highlight is picked by clicking words in the headline (and in the body on rule slides): click a word to highlight it, a neighbour to extend, an end word to drop it. No typing, so it always matches. The check ignores case, so a highlight typed or written by Claude as "Project" matches "project".

**S2c. One-pager: Built (0.2.9, browser-tested, untested on Windows).** A sixth slide kind, "One-pager", for a single-image LinkedIn post: kicker (tag), headline, optional short text and six numbered cards in a 2 x 3 grid (3 x 2 on 16:9), light ground, profile footer. Reason: single infographics were 29% of the top 1% of LinkedIn posts in Q1 2026, against 6% for carousels, and 4:5 portrait images get the highest median engagement (research 2026.11.22). Henning asked for a 6-card layout (2026.11.23).
- Add it with "+ One-pager" next to "+ Rule" and "+ Text" (one click), or pick "One-pager" as the type of any slide. Reason for the new button: the format must be reachable without changing an existing slide.
- Each card has a title (at most 4 words; drawn on one line at 42 down to 34 px, else two lines) and a text (at most 8 words, Inter 36 px, the body floor). Text that does not fit is a "stop" and is clipped to its card, never drawn outside it.
- One highlight per slide: click a card's number to draw that card on navy with a gold number, or pick words in the headline; both at once is a warning.
- A deck of only one-pagers is not a carousel: no 6 to 9 slides warning, no page number in the footer, and Export writes the PNGs only (LinkedIn takes the image, not a PDF).
- Claude's brief and draft format know the kind: `{"kind":"sheet","cards":[{"title":"","text":""}],"hiCard":null}`.

**S2. Studio window (C2): Built.** Recent screenshots from `Pictures\Klik` (newest 60); one click adds a screenshot slide. Slide kinds: cover (dark), screenshot (light), rule (light), text (light), closer (dark), one-pager (light, S2c). A rule slide gets "Rule n of N" and the big indigo number automatically, a body with one indigo span, and an "In practice" line. Per slide: tag, headline, highlight, body, screenshot. Reorder, delete, add rule or text slide. The deck is saved automatically on the PC.

**S3a. Profile on the card: Built (0.2.7, browser-tested).** The profile form left the slide column. Click your name or photo on the slide (the pointer shows it is clickable), or "Add your name and photo" under a slide that still shows the placeholder, and the profile opens in the right panel while the slide stays visible. "Done" or `Esc` goes back to the slide fields. It stays filled after a restart. 0.2.8: the preview keeps its 4:5 or 16:9 shape in a wide window (it was stretched to the full width with the height cut, so slide and screenshot looked squeezed and the click missed the name; Windows test 2026.11.22). Reason: the profile is typed once, so it should not take room on every visit (Henning 2026.11.22).

**S3b. Large portrait on the cover: Built (0.2.7, browser-tested, 4:5 only).** With a photo, the cover can show it small (the card, default) or as a large portrait standing at the bottom right, with name, title and experience beside it and "Swipe →" above the name. Works best with a PNG whose background is removed; Klik does not remove backgrounds (Gen 2 idea). 16:9 keeps the card.

**S3. Profile (part of C2): Built, changed.** Name, title, experience line, photo and an optional light logo for the closer. All are kept only on the user's PC and never in the repo. Because Klik is public, the defaults are placeholders (`[Your name]`, `[Your title]`) instead of Henning's details, and the RTPM logo is not shipped: each user adds their own logo once (Henning adds the RTPM wordmark).

**S4. Two formats (C3): Built.**

| Format | Size | Use | Layout |
|---|---|---|---|
| 4:5 carousel | 1080 × 1350 per page | LinkedIn document post | One column. Nothing essential below y 1170 |
| 16:9 slides | 1920 × 1080 per page | Demo, user walkthrough, website | Text left, screenshot right. Its own layout, never a crop of 4:5 |

**S5. Brand checks (C4): Built.** Slides follow the approved RTPM V2 carousel template (brand guide section 5b, 2026.11.16): cover with soft indigo glow, kicker, headline, subtitle, "Swipe →" right-aligned in light blue, and the profile block; interiors with a round headshot, name and page "3/8" in indigo; rule slides as above. Fonts: Barlow Semi Condensed 700/600 for headlines and "Swipe", Inter for the rest (bundled). One highlight per slide: gold on dark, indigo on light. Text shrinks to the phone floors (headline 64 px, body 36 px, labels 30 px) and is flagged if it still does not fit. Also flagged: em-dashes, URLs, a highlight not taken from its text, more than 4 highlighted words, headline outside 4 to 8 words, body over 25 words, any number outside a `[placeholder]` (must come from an approved source), "AI-powered" or "unique" in a headline, a rule slide without "In practice", carousel length outside 6 to 9. The glow values are a proposal until the brand system fixes them.

*Two brands, kept apart:* the Studio window uses the RTPM **product** brand like the rest of Klik (Inter, light, tokens in `app/src/styles.css`). The slides use the RTPM **content** brand (Barlow Semi Condensed + Inter, navy and paper grounds); those tokens live only in `app/src/studio/render.ts` and are used only on slide canvases.

**S6. Export (C5): Built.** One PDF (`Carousel.pdf` or `Slides.pdf`, Danish names on Danish Windows) plus one PNG per slide in `Pictures\Klik\Studio\<date> <title> <format>\`. The folder opens when done. A person always presses Export.

**S7. Claude writes the story (C6): Built, untested with Claude Desktop.** The user writes the audience and angle and copies a brief to Claude Desktop. With the Klik connector, Claude looks at the screenshots and saves a draft with `handoff_write`: a fenced `klik-deck` JSON block (format, title, angle, slides). Studio lists drafts from the inbox and loads one with one click; without the connector the user can paste Claude's JSON. Claude never edits screenshots or files.

- **Accept when:** in Claude Desktop, one pasted brief gives a draft that loads in Studio and exports with only light edits; and Henning makes one carousel from his own captures and exports it on Windows.

**Open in Studio**

| # | Question or gap |
|---|---|
| SQ1 (was CQ1) | Should Claude be able to start an export itself (a write tool in klik-mcp), or should a person always press Export? Today a person always exports. |
| SQ2 (was CQ2) | ~~Merge the content maker into Klik or keep two apps?~~ Decided 2026.11.17: one app (S1). |
| SQ3 (was CQ3) | ~~Role line in the profile chip~~ Decided 2026.11.16: title plus experience line, now user settings (S3). |
| SQ4 | **Screenshot crop for phones: Open.** A full screenshot in a 904 px card makes app text about 5 pt on a phone. Studio needs a crop step to the relevant area. |
| SQ5 | Recording to post (was C7) is F15. |

## 4. Click budget

These targets are the pass/fail test. Henning does each task in Snagit and in Klik. Klik passes when every task needs fewer clicks than Snagit and no task shows a dialog.

| Task | Klik flow | Target |
|---|---|---|
| Area screenshot into Teams | `Ctrl+Alt+K` → drag → `Ctrl+V` in Teams | 1 drag |
| Screenshot with steps 1–3 | `Ctrl+Alt+K` → drag → `A` → 3 drags → `Ctrl+V` | 1 + 3 drags |
| 10-step guide | hotkey → your 10 clicks → hotkey | 0 extra clicks |
| Video with indigo cursor | hotkey → drag → … → hotkey | 1 drag |
| Long page | hotkey → click in window | 1 click |
| Screenshot as a Studio slide | `Ctrl+Alt+K` → drag → markings → `S` | 1 drag, 0 clicks (or 1 click on "Studio") |
| Older screenshot into the deck | in Studio: click it in the gallery | 1 click |
| One-pager with six cards | in Studio: "+ One-pager" → type headline and cards → Export | 2 clicks |
| More markings on an older screenshot | in Studio: pencil → mark → `Esc` | 1 click |
| Open Studio to see earlier screenshots | click the Klik icon on the taskbar | 1 click |
| Screenshot without the hotkey | Klik icon → "New screenshot" → drag (or right-click the icon → "Take screenshot") | 2 clicks + 1 drag |

## 5. Non-functional requirements

- **Platform:** Windows 11 first. Mac is out of scope for now.
- **Speed (targets, not yet measured):** editor visible in under 0.3 seconds after the hotkey, and Esc to clipboard in under 0.5 seconds on a 4K monitor.
- **Screens:** several monitors with different scaling must work. The capture follows the mouse.
- **Storage (Built, 0.2.1):** everything Klik saves is under `Pictures\Klik\`: screenshots in the folder itself, handoffs in `Inbox\`, Studio exports in `Studio\`. Klik never writes to Documents, because on a work PC that folder is often redirected to a client or project folder (found on Henning's PC 2026.11.17). File names are `Klik YYYY.MM.DD HH.MM NNN.png`, for example `Klik 2026.11.17 19.30 001.png`; NNN counts up through the day. A dot separates hours and minutes because Windows does not allow a colon in a file name. Older files named `Klik YYYY-MM-DD HHMMSS.png` are still read. A handoff inbox left in `Documents\Klik\Inbox` by 0.2.0 is not moved.
- **Privacy:** no telemetry. No network calls except F9 and F15, and only when the user starts them. Klik Studio (F16) makes no network calls; Claude only sees what the user's own Claude connection asks for.
- **Language:** English user interface, and Danish when Windows runs in Danish (decided 2026.11.17). Few words, so keeping both costs little. Studio has a small, grey EN/DA switch in its top bar (Built, 0.2.3; made quiet in 0.2.4, as it is a setting), because Studio has the most text; the choice also applies to the editor. The tray menu still follows Windows.
- **Install:** no admin rights needed.

## 6. Out of scope for the MVP

Webcam-only recording, GIF export, cloud sharing links, team review and comments, OCR (copying text from images), automatic redaction, templates, stamps, a library or gallery, and Mac.

## 7. Clean-room rule

Klik copies Snagit's ideas, not its code or look. It is built from public descriptions and observed behaviour. No decompiling or reverse engineering of Snagit's software, and no use of TechSmith's name, icons, sounds or UI assets. Snagit's licence terms and trademarks apply. This is not legal advice: check with a lawyer before selling Klik.

## 8. Open questions

| # | Question | Why it matters |
|---|---|---|
| Q1 | ~~Product to sell, or internal tool?~~ Decided 2026.11.17: free and open source (MIT) for anyone, to show what RTPM can do | - |
| Q2 | ~~Chrome extension or Windows app first?~~ Decided 2026.11.15: standalone Windows app only | - |
| Q3 | Highlighter: was "marker" meant as a yellow highlighter (built) or a red pen? | The default tool |
| Q4 | ~~Danish only, or Danish and English?~~ Decided 2026.11.17: English, plus Danish on Danish Windows | - |
| Q5 | Whose Claude account pays for F9, and where do client guides get stored (local folder, SharePoint)? | Cost and client data rules |
| Q7 | F15: which voice and AI services, and who pays? Is an AI voice used at all on client-facing demos? | Cost, consent and how an AI voice is labelled |
| Q6 | Do most of Henning's AI sessions run in Claude Desktop and Claude Code on the PC, or in the browser and on the phone? | F13 and F14 only work locally without the Drive bridge |

## 9. Source of these wishes

Henning's messages in the Claude Code sessions of 2026.11.13–17. The earlier build plan and Snagit research are in the history of `PLAN.md` (removed when Klik moved to this repo).

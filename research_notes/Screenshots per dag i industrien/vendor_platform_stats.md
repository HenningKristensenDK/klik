# Published screenshot usage numbers from tool vendors and OS/platform makers

Researched 2026-11-22. Evidence labels used below:
- **Telemetry**: counted by the vendor's own systems (uploads, active users).
- **Survey**: self-reported answers from respondents.
- **Marketing claim**: a number on a product page or press release with no stated method or date.
- **Untraced**: circulates without a primary source I could find.
- **Derived**: my own arithmetic from published totals. Math shown. Not a published number.

Overall finding: no OS maker (Microsoft, Apple, Google, Samsung) and no major screenshot vendor publishes a per-user screenshot rate. The only published per-person rate found is a 2025 Smallpdf survey (5 per day, self-reported, phone and desktop mixed). The only total that converts to a per-user rate is Gyazo's 2014 upload telemetry.

## TechSmith (Snagit, Jing, "Value of Visuals", "Chaos to Clarity")

### Takeaway
TechSmith publishes surveys about the value of visuals and time saved, but no figure on how many screenshots people take per day or week, and no share of workers who capture screens.

### Cited Findings
- "The Value of Visuals" (TechSmith with Cebr; PDF metadata shows it was produced 2017 to 2018): surveyed office workers across six geographies (Australia, Canada, DACH, France, UK, US); an experiment compared a text-only email with "an email with text and annotated screenshots" and a video walkthrough for three office tasks. Claims 67% of employees perform better with visual communication and absorb it 7% faster; claims visuals "could unlock 6 minutes and 43 seconds a day for every affected employee" (33 min 36 s per 40-hour week). Survey plus vendor-commissioned experiment; no capture-frequency figure. — [TechSmith, Value of Visuals PDF](https://assets.techsmith.com/resources/Value-of-Visuals.pdf)
- Search summaries of the same research cite 4,500 office workers in six countries and "$1,200 of productivity" per affected employee per year. I did not find these two figures in the extracted PDF text; treat as secondary. — [TechSmith research hub](https://techsmith.com/visual-communication-research.html)
- "From Chaos to Clarity" (2023): survey of 900+ full-time workers in digital communication roles in the US, UK, Germany and France, fielded by Qualtrics, July to August 2023. "97% of those who create images like screenshots, infographics, and charts" say it makes messages more effective. Base is only people who already create images; no frequency figure. Survey. — [TechSmith, Chaos to Clarity report](https://www.techsmith.com/resources/research/chaos-to-clarity-report/); [TechSmith blog](https://techsmith.com/blog/latest/chaos-to-clarity-research)
- TechSmith video study (2022): 91% watch instructional or informational videos at work at least monthly, 71% at least weekly. About watching video, not capturing screenshots. Survey. — [PR Newswire, TechSmith](https://prnewswire.com/news-releases/techsmith-new-research-shows-the-importance-of-using-video-at-work-301493177.html)
- TechSmith 2024 Workplace Flexibility Trends report covers interruptions and preference for emails with images or video; no screenshot frequency. Survey. — [TechSmith 2024 report](https://techsmith.com/research-2024-Workplace-Flexibility-Trends-Report.html)

### Inferences
- TechSmith's numbers support "visuals help" and "time can be saved", not "how often". Any "TechSmith says workers take N screenshots a day" claim should be treated as untraced.
- All TechSmith figures are vendor-commissioned and favour Snagit and Camtasia.

### Gaps
- No TechSmith figure on Snagit captures per user, Snagit user counts with capture totals, or Jing upload totals was found.
- Could not confirm the 4,500-respondent sample and the $1,200 figure in the PDF text itself.

## Microsoft (Snipping Tool, Snip & Sketch, Win+Shift+S, Print Screen, Teams/M365)

### Takeaway
I found no published Microsoft count of snips, Snipping Tool users or Print Screen presses, on the Windows blog, the Windows Insider blog or in press coverage. Microsoft changed Print Screen to open Snipping Tool without publishing the usage data behind the change.

### Cited Findings
- Windows Insider blog posts on Snipping Tool (2025: shapes markup, Quick markup, GIF export) describe features and give no usage numbers. — [Windows blog, Snipping Tool tag](https://blogs.windows.com/blog/tag/snipping-tool/); [Windows Insider blog, 2025-09-17](https://blogs.windows.com/windows-insider/2025/09/17/paint-snipping-tool-and-notepad-app-updates-begin-rolling-out-to-windows-insiders/)
- In 2023 Windows 11 changed the Print Screen key default to open Snipping Tool instead of copying a full-screen image to the clipboard; coverage gives no usage data. — [The Register, 2023-04-13](https://www.theregister.com/2023/04/13/microsoft_snipping_tool_default/); [Tom's Hardware](https://www.tomshardware.com/news/windows-11-print-screen-snipping-tool)
- An old Microsoft education blog (circa 2016, about the separate "Snip" tool) says snipping is an everyday task for "millions of Office users". General statement, not a count. Marketing claim. — [Microsoft Learn archive, NZ Edu blog](https://learn.microsoft.com/en-us/archive/blogs/nzedu/announcement-a-new-tool-for-educators-snip)
- Windows Recall takes automatic snapshots of the screen; these are not user screenshots and should not be counted as such. Android Authority contrasts Recall's frequency with Pixel Screenshots. — [Android Authority](https://www.androidauthority.com/pixel-screenshots-throttle-3472066)

### Inferences
- The Print Screen default change suggests Microsoft saw enough screenshot activity to route it to its own tool, but this is inference; Microsoft did not publish the reason in figures.

### Gaps
- No Microsoft telemetry on snips per user per day, Win+Shift+S use, Snipping Tool monthly active users, Windows clipboard history image share, or Teams/Outlook image pastes was found.

## Apple, Google (Android, ChromeOS), Samsung

### Takeaway
None of the three publishes a screenshots-per-user figure. The only Google number found is a product processing limit, not usage.

### Cited Findings
- Pixel Screenshots app (Pixel 9, 2024) processes only about 15 screenshots a day automatically; the rest wait until the phone is idle and charging. A product throttle, not a usage statistic. Phone. — [Android Authority, 2024](https://www.androidauthority.com/pixel-screenshots-throttle-3472066)
- Google I/O keynotes have published photo-type counts but not screenshots, e.g. "93 million selfies" taken daily on Android (2014) and 1.2 billion Google Photos uploads per day (2017). Telemetry, but not about screenshots. Phone. — [Neowin, Google by the numbers (2014)](https://www.neowin.net/news/google-by-the-numbers-1-billion-active-android-users/); [Wccftech, I/O 2017](https://wccftech.com/google-boasts-2-billion-users-numbers/)

### Inferences
- If Google wanted to cap Pixel Screenshots at 15 per day of automatic processing, typical users probably take fewer than that most days, or the cap would frustrate many. This is speculation, not data.

### Gaps
- No Apple, Samsung or ChromeOS screenshot statistics found.

## Screenshot vendors: user counts and capture totals

### Takeaway
Vendors publish user counts (mostly undated marketing claims) and a few cumulative upload totals. Only Gyazo's 2014 figures pair uploads with active users in the same period, giving a derived rate of about 3.5 uploads per monthly user per month.

### Cited Findings
- **Gyazo (Nota Inc., now Helpfeel)**, November 2014: 13.02 million uploads per month ("月間アップロード数1302万件") and 3.75 million monthly unique users ("月間ユニークユーザー375万人"). Telemetry reported in funding coverage. — [THE BRIDGE, 2014-11-11](https://thebridge.jp/2014/11/nota-gyazo-funding)
- **Derived (Gyazo 2014)**: 13.02 M uploads ÷ 3.75 M monthly unique users = 3.47 uploads per user per month, about 0.8 per week. Caveats: "unique users" may include people who only view Gyazo links, which would push the rate per capturer up; Gyazo uploads every capture by design, so uploads approximate captures for its users; the data is 12 years old.
- **Gyazo** now claims "used by 20 million people around the world". Undated marketing claim. — [Gyazo download page](https://gyazo.com/download)
- **Gyazo** breach: a secondary blog says about 490 million images were affected. Single secondary source, unverified; if true it implies a large cumulative image store but no per-user rate. — [redact.dev](https://redact.dev/blog/gyazo-alternatives)
- **Lightshot (Skillbrains)**: "more than two billion screenshots have been uploaded", per Lightshot's own website as reported by Wired (2021 article; I could only reach a mirror, wired.com blocked the fetch). Cumulative, undated, marketing claim. No matching user count, so no per-user rate can be derived. Uploading is optional in Lightshot, so uploads undercount captures. — [Wired mirror](https://wirednews.pages.dev/story/lightshot-chrome-screenshot-app); [Zoftwarehub](https://zoftwarehub.com/products/lightshot/product-details)
- **Zight (formerly CloudApp)**: "Trusted by 5m+ people". Marketing claim, no capture count. TrustRadius cites 4M users. — [Zight screenshot page](https://zight.com/screenshot); [TrustRadius](https://trustradius.com/compare-products/droplr-vs-zight)
- **Loom (Atlassian)**: press release cites more than 18 million users; a later Loom page cites more than 25 million people across 400,000 companies. Video-focused; no screenshot counts. Loom's 2025 year-in-review gives no usage counts. Marketing claims. — [AAP / GlobeNewswire release](https://www.aap.com.au/aapreleases/globenewswire8697850/); [Atlassian, Loom 2025 in review, 2025-12-04](https://www.atlassian.com/blog/loom/2025-in-review)
- **Droplr**: "over 5 million users" on a marketing page, undated. — [Zight comparison page citing Droplr](https://zight.com/blog/droplr-alternative/)
- **ShareX, Greenshot, CleanShot X, Jam.dev, Markup Hero, Monosnap**: no user totals or capture totals found in search. Only review-site counts (G2) and AlternativeTo likes. — [G2 comparison](https://www.g2.com/compare/lightshot-vs-sharex-vs-greenshot)

### Inferences
- The Gyazo derived rate (about 3.5 per month) is far below the Smallpdf survey's 5 per day. Likely reasons: Gyazo counts only captures made with Gyazo (users also use OS tools), the denominator may include viewers, and surveys inflate self-reported habits. Neither is a clean measure of total screenshots per worker.
- Vendor "users" numbers are lifetime or undated and cannot be turned into daily rates.

### Gaps
- No vendor publishes captures per active user per day.
- GitHub release download counts for ShareX and Greenshot were not checked; they would give install volume, not usage.

## The "average person takes N screenshots a day" stat

### Takeaway
The most-quoted modern figure, 5 screenshots a day, traces to a Smallpdf survey of 1,000 full-time US employees published 18 November 2025. It is a vendor survey, self-reported, and mixes phone and desktop.

### Cited Findings
- Smallpdf (PDF software vendor), published 2025-11-18: "Americans take an average of 5 screenshots per day, adding up to about 35 each week or more than 1,800 every year"; "around 430 screenshots saved across their devices" (Gen X and older: 220; legal services: 340; finance and banking: 335). Method: "Smallpdf surveyed 1,000 full-time U.S. employees" across industries; mean age 39; 58% millennials, 14% Gen Z, 28% Gen X and older. No sampling method, question wording or field dates stated. Survey, vendor-run. — [Smallpdf, "Screenshotted to death"](https://smallpdf.com/blog/screenshotted-to-death)
- Same survey, storage: 73% keep screenshots in their camera roll or photo gallery, 24% in cloud storage, 21% in a desktop folder, 6% in messaging apps, 5% use a screenshot tool; 15% do not organise them. 43% prefer screenshots to save or share important information (23% PDFs, 34% both). 20% have accidentally shared a screenshot with private or sensitive information. — [Smallpdf](https://smallpdf.com/blog/screenshotted-to-death)
- An informal GitHub survey, "Screenshot Habits", reports 21% take screenshots multiple times a day; method unclear. — [GitHub, saraclay/Screenshot-Habits](https://www.github.com/saraclay/Screenshot-Habits)
- Academic "Screenome" studies capture a screenshot every 5 seconds automatically; they measure screen content, not how often people choose to take screenshots, and should not be cited as screenshot-taking rates. — [Springer, Behavior Research Methods 2022](https://link.springer.com/article/10.3758/s13428-022-02006-z)

### Inferences
- Smallpdf's sample is "employees", but its headline says "Americans", and 73% store screenshots in the camera roll, so the 5 per day is mostly phone behaviour, not desktop work capture.
- 1,800 per year = 5 × 365, so the yearly figure is arithmetic from the daily one, not a separate measure.

### Gaps
- No telemetry-based "screenshots per person per day" from any platform was found.
- Older viral variants (pre-2025) of the "N per day" stat were not found with a primary source.

## Clipboard managers and paste vs save

### Takeaway
No clipboard manager vendor (Ditto, Paste, Raycast) or Microsoft (clipboard history) publishes copy/paste frequency or the share of images. No vendor publishes how many screenshots go straight to Teams, Slack, email, Jira or Office versus being saved to a file.

### Cited Findings
- Pegasystems (2018, vendor) is widely cited as finding workers do about 134 copy-and-paste actions per day and switch apps over 1,100 times per day, based on desktop activity data. I could not open the source article (403), so this is secondary and the method is unverified. — [TechRepublic](https://www.techrepublic.com/article/employees-switch-apps-more-than-1100-times-a-day/)
- Academic baseline, not a vendor: a 90-day log study of 17 desktop users found clipboard operations more common than drag-and-drop (Woodruff and Alexander, IJHCS 132, 2019). The abstract gives no totals and no image/text split. — [Lancaster University eprints](https://eprints.lancs.ac.uk/id/eprint/136474)
- The only paste-vs-save proxy found is Smallpdf's storage question (6% store screenshots in messaging apps; 21% in a desktop folder; 73% camera roll). It measures where people keep screenshots, not whether they paste them directly. Survey. — [Smallpdf](https://smallpdf.com/blog/screenshotted-to-death)
- Windows 11's pre-2023 Print Screen behaviour copied the capture to the clipboard; Microsoft has published nothing on how often that clipboard image was pasted. — [Tom's Hardware](https://www.tomshardware.com/news/windows-11-print-screen-snipping-tool)

### Inferences
- The absence of paste-vs-save data is itself a finding: any Klik claim about "most screenshots are pasted, not saved" would need Klik's own (opt-in, local) measurement or a cited user study.

### Gaps
- No Slack, Atlassian, Microsoft Teams or Outlook data on images pasted per user.
- No Ditto, Paste, Raycast or Windows clipboard history statistics.

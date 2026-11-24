# Screenshot frequency by role and workplace: surveys, ticket data, destinations, time per screenshot

Scope: role-level evidence on how many screenshots engineers, project people, developers, QA, support/IT, designers and construction/energy/manufacturing/infrastructure staff take per day and paste into other apps. Research date: 2026-11-22. 15 web calls plus one local PDF text extraction.

Headline for the report writer: I found **no measured, role-level "screenshots per day" figure** for any of the target roles, from any survey, telemetry release or workplace study, 2018 to 2026. The best hard numbers are indirect: the share of software issue reports that carry images (about 15% to 41%, rising over time), and BIM coordination standards that require a snapshot on every issue. Everything on time per screenshot is vendor estimate or marketing. Any per-day number for a role will have to be built as an estimate from these pieces, and labelled as such.

Evidence labels used below: **[peer-reviewed]**, **[survey]**, **[vendor survey]** (survey run by a company selling a related product), **[telemetry]**, **[vendor claim]**, **[estimate]**, **[anecdote]**, **[standard/spec]**.

---

## 1. Surveys of workers on screenshot use by role

### Takeaway
No survey found that reports screenshots per day by job role. The only daily-frequency numbers are general-population or smartphone figures with weak or unverifiable provenance; vendor surveys (TechSmith) show preference for visuals but not counts.

### Cited Findings
- A search-engine summary attributes to Smallpdf a survey of 1,000 full-time US employees reporting "an average of 5 screenshots per day". **[vendor survey, UNVERIFIED]** I could not open the page (fetch returned only the title), the page date was unreadable, and a separate search of Smallpdf's 1,000-person surveys found no screenshot count. Do not cite the "5 per day" figure without first opening the page. — [Smallpdf, "Screenshotted to Death"](https://smallpdf.com/blog/screenshotted-to-death)
- Smallpdf runs a series of ~1,000-respondent US employee surveys (PDF time, file search, file naming, document trust); the ones found do not measure screenshots. One reports workers spend about 4.5 hours a week searching for files or links they had already seen (n=1,005). **[vendor survey]** — [Smallpdf digital declutter report](https://smallpdf.com/blog/digital-declutter-report); [Smallpdf hidden PDF tax](https://smallpdf.com/blog/hidden-pdf-tax-on-american-workforce)
- A GitHub-hosted student-style survey of 55 smartphone users found 21% take screenshots "multiple times a day". Personal smartphone use, tiny sample, not work. **[survey, very low quality]** — [saraclay/Screenshot-Habits](https://github.com/saraclay/Screenshot-Habits)
- TechSmith (maker of Snagit) 2018 study of 4,500 office workers in six countries: younger workers prefer visual content such as screenshots and screencasts. No frequency per day, no role split found in the summaries. **[vendor survey]** — [TechSmith eGuide 2019](https://assets.techsmith.com/Docs/TechSmith_eGuide_Improving_Your_Internal_Communications_2019.pdf); [ComputerWeekly coverage](https://www.computerweekly.com/news/252441233/Companies-need-to-adapt-to-multimedia-communication-demands-from-millennials)
- TechSmith 2023 "From Chaos to Clarity" (with Qualtrics): half of respondents say the amount of communication hurts their productivity. Not screenshot-specific. **[vendor survey]** — [TechSmith blog](https://techsmith.com/blog/latest/chaos-to-clarity-research); [report PDF](https://assets.techsmith.com/Docs/chaos-to-clarity-workplace-communication.pdf)
- TechSmith "Value of Visuals" claims up to $1,200 per employee per year saved by using visual content, $167 billion workforce-wide. Method and date not confirmed. **[vendor claim]** — [TechSmith Value of Visuals PDF](https://assets.techsmith.com/resources/Value-of-Visuals.pdf)
- Microsoft does not publish Snipping Tool usage counts; its diagnostic-data documentation lists categories but no app-level figures. Third-party "popularity" sites (Desktop Insights) rank Snipping Tool highly from installs and ratings, not usage. **[no telemetry public]** — [Microsoft Learn: Windows diagnostic data](https://learn.microsoft.com/windows/privacy/windows-diagnostic-data); [Desktop Insights](https://desktopinsights.com/apps/snipping-tool)
- Employee-monitoring tools (Hubstaff, Time Doctor, DeskTime) take automatic screenshots at fixed intervals (e.g. 48 to 96 per 8-hour shift at 10- or 5-minute intervals). These are surveillance captures, not user-initiated screenshots; exclude from any frequency estimate, but beware they inflate "screenshots per day" figures found online. **[vendor documentation / arithmetic]** — [Screenshot monitoring best practices](https://www.employee-monitoring.net/blog/screenshot-monitoring-best-practices); [My Hours](https://myhours.com/articles/screenshot-monitoring)

### Inferences
- The lack of public data is itself a finding: neither Microsoft (Snipping Tool, Win+Shift+S), Apple, Slack, Atlassian, Stack Overflow nor State of Testing surveys publish screenshots-per-day by role, as far as these searches show.
- Klik can produce the first real number for its target roles only by measuring it (opt-in local counter, or a timed diary study with clients). That fits the "local by default" promise if counts stay on the PC unless the user shares them.

### Gaps
- No Stack Overflow Developer Survey, Microsoft Work Trend Index, Atlassian State of Teams, Slack Workforce Index or State of Testing item on screenshot frequency was found (searches did not surface any; not exhaustively checked survey by survey).
- No Europe/Nordic data at all.
- No role split (engineer vs PM vs QA vs support) in any source.

---

## 2. Screenshots in Jira tickets, bug reports and support tickets

### Takeaway
This is the strongest measured evidence. In open-source GitHub issue trackers, 17% of issues contain images (2017 to mid-2022, 34 large repos), rising from 14.9% (2017) to 27.4% (2021). Android bug datasets range from 15.7% to 41.4%. In one industrial (banking software) tracker, a "large fraction" carried screenshots and 84% of reports with attachments had screenshots. Most images are UI screenshots, usually one per report.

### Cited Findings
- Kuramoto et al. (Empirical Software Engineering 2024): 34 GitHub repos with more than 10,000 issues each, 2017 to June 2022, **481,603 issue reports; 79,212 (17.10%) contain images, 9,615 (2.30%) contain videos**. Median 1 image per visual issue (3rd quartile 2). Visual share rose from **14.9% in 2017 to 27.4% in 2021**. Visual issues are more likely to be bugs (44.6% of image issues vs 32.2% of non-visual), get first comments faster, and image issues close faster. Images mostly show program output (41.3%) and UI (20.8%). **[peer-reviewed, repository mining]** Note: a search snippet gave 683,810 issues; the paper's Table 1 says 481,603 after removing pull requests. Use 481,603. — [Kuramoto et al., EMSE 2024 (PDF)](https://posl.ait.kyushu-u.ac.jp/~kamei/publications/Kuramoto_EMSE2024.pdf)
- The same paper cites prior work that "on average, over 70% of bug reports lack these elements" (visual elements). **[peer-reviewed, secondary citation]** — [Kuramoto et al., EMSE 2024](https://posl.ait.kyushu-u.ac.jp/~kamei/publications/Kuramoto_EMSE2024.pdf)
- Jupyter Notebook project: over a quarter of issues contain visual content; about 60% of that visual content is screenshots or mockups of the product. **[peer-reviewed, EASE 2022]** — [arXiv 2204.13262](https://arxiv.org/abs/2204.13262)
- MSR 2025 study of Android apps: **15.67% (7,988 of 50,988) GitHub bug reports contain images** (645 F-Droid apps). In a 367-report sample, 95.18% of images were UI screenshots, 70.77% of reports had one image, average 1.48 images per report. Comparison datasets: RegDroid 41.35% (165/399), AndroR2 23.33% (42/180). Crawl date not stated. **[peer-reviewed]** — [arXiv 2502.15099](https://arxiv.org/html/2502.15099v1)
- Softtech (software arm of a large Turkish private bank), 41,042 issue reports, March to August 2019: among reports with attachments, **84.30% had screenshot attachments**; reports with attachments had fewer words (29 vs 41). The abstract says "a large fraction" of all reports had screenshots, but the overall share was not confirmed in what I read. This is the only enterprise (non-open-source) tracker data found, and the reporters are internal business users, closer to Klik's target than open-source data. **[peer-reviewed, industrial]** — [Aktas et al., arXiv 2306.03634](https://arxiv.org/abs/2306.03634); [ICSE-SEIP 2020 version](https://research.sabanciuniv.edu/40548/1/ICSE-20-TriagingUsingAttachments.pdf)
- Bettenburg et al. ("What makes a good bug report?", FSE 2008 / TSE 2010), survey of Apache, Eclipse and Mozilla developers (156 responses in the 2007 tech report; 466 developers and users in the 2010 journal version): developers often need screenshots, while reporters overlook them. A table in the 2007 report lists "screenshots" at 15%, 39%, 18%, but the question and column mapping were not verified; do not quote these as figures. **[peer-reviewed survey, pre-2018]** — [Bettenburg et al. tech report 2007](https://www.st.cs.uni-saarland.de/publications/files/bettenburg-tr-2007.pdf); [Zimmermann et al., TSE 2010](https://thomas-zimmermann.com/publications/files/zimmermann-tse-2010.pdf)
- Mozilla/Bugzilla and Stack Overflow study: 22,561 shared images classified and 168 developers surveyed on visual content. **[peer-reviewed]** — [arXiv 2306.15851](https://web3.arxiv.org/pdf/2306.15851)
- Jam.dev (bug-capture vendor) case studies: Cofactr "1 hour of engineering time saved per bug"; Ramp "100+ hours of design time"; Jam claims "$9,000+ per engineer per year". No method published. A Visor PM describes manual screenshot plus console capture as slow and rarely specific enough. **[vendor claim / customer anecdote]** — [Jam: Cofactr](https://jam.dev/blog/cofactr-customer-story-jam/); [Jam: Ramp](https://jam.dev/blog/how-jam-helps-ramp-save-100-hours-of-design-time-with-faster-bug-reporting/); [Jam: Visor](https://jam.dev/blog/how-visor-ships-new-features-faster-with-jam/); [Jam: six figures](https://jam.dev/blog/how-companies-using-jam-are-saving-six-figures-annually/)

### Inferences
- [estimate] Image share in tickets is rising roughly 2 points per year in open source (14.9% to 27.4% over 2017 to 2021). By 2026 a share of 25% to 40% in active trackers is plausible but unmeasured.
- [estimate] Per-person rate can be bounded only with ticket volume per person, which none of these sources give. If a QA tester files N tickets per day, roughly 0.2 to 0.4 N carry a screenshot, and about 1.5 images each. Ticket screenshots are a floor: chat and email screenshots are not counted here.
- The Softtech finding (enterprise users attach screenshots heavily and write fewer words) supports Klik's "screenshot plus one line" flow for non-developer reporters.

### Gaps
- No Jira/Atlassian or Zendesk/ServiceNow published statistic on share of tickets with image attachments.
- No support/IT helpdesk data on screenshots per ticket.
- No per-person daily rate for QA, developers or support.

---

## 3. Construction, engineering and project control

### Takeaway
No measured screenshot frequency found for construction, renewables, manufacturing or infrastructure roles. The structural evidence is strong, though: the open BIM issue standard (BCF) attaches a snapshot to every issue, Procore's importer requires one, and a mid-size project produces 400 to 2,000 coordination issues (one practitioner source).

### Cited Findings
- BCF (BIM Collaboration Format, buildingSMART): each issue topic carries a snapshot image; BCF 1.0 allowed one, BCF 2.0 allows several. **[standard/spec]** — [buildingSMART BCF documentation (GitHub)](https://github.com/BuildingSMART/BCF/blob/1d3ad49bced7f27135c5ce4ca6ac3591ad1057b8/Documentation/README.md); [Leica Cyclone 3DR BCF help](https://cyclone3dr.leica-geosystems.com/help/2024.0/BCFBimCollaborationFormat.html)
- Procore's Coordination Issues import expects at least one snapshot or viewpoint per issue and a link to at least one model element. **[vendor documentation]** — [Procore support FAQ](https://support.procore.com/faq/how-can-i-prevent-import-errors-when-using-the-coordination-issues-tool)
- A practitioner blog states a mid-size project generates 400 to 2,000 BIM issues, and warns against exporting 1,400 raw Navisworks clashes as 1,400 BCF issues; its title is "Stop coordinating by screenshot", implying screenshot-in-email coordination is common. **[anecdote / practitioner blog]** — [Archgyan: BCF workflow](https://archgyan.com/bcf-workflow-bim-issue-management/)
- OpenProject and Autodesk BIM Collaborate both build issue workflows around viewpoint snapshots. **[vendor documentation]** — [OpenProject BIM issue management](https://www.openproject.org/docs/bim-guide/bim-issue-management/); [Autodesk BIM Collaborate](https://www.autodesk.com/blogs/construction/issue-resolution-clash-avoidance-autodesk-bim-collaborate/)
- BuiltWorlds 2022 benchmarking survey: Procore most used among general and specialty contractors; Bluebeam rated highest for collaboration and document management; Procore plus Bluebeam is among the most common pairings. Data 2021 to 2022. No screenshot data. **[survey]** — [BuiltWorlds 2022 PM & Oversight report preview](https://builtworlds.com/insights/2022-project-management-oversight-construction-technology-report-copy/)
- Nutrient (PDF SDK vendor) describes construction teams split across Procore, Bluebeam and email with no clean link between them, and is running a survey of project managers and document controllers. No results published in what I found. **[vendor claim]** — [Nutrient construction research study](https://www.nutrient.io/research-study/construction/)
- Procore customer survey (2022): 8 days faster RFI distribution, 90% report better communication. Not screenshot-specific. **[vendor survey]** — [Procore RFIs](https://www.procore.com/project-management/rfis)

### Inferences
- [estimate] In BIM coordination, issue count is a floor on snapshot count: 400 to 2,000 issues over a project's design phase is roughly 2 to 10 snapshots per working day per project team, spread across coordinators. This is arithmetic on an anecdotal range, not a measurement.
- Construction screenshots are probably split between native tool snapshots (BCF, Procore, Bluebeam) and ad hoc OS screenshots pasted into email, Teams, RFIs and progress reports. Only the native ones are structurally guaranteed; the ad hoc share is unmeasured.
- Renewables, manufacturing and infrastructure: no source found at all. Treat any number for these as [placeholder].

### Gaps
- No Dodge, FMI, Autodesk/FMI "Construction Disconnected" or JBKnowledge ConTech data on screenshots found in these searches.
- No measured share of RFIs, NCRs or daily reports carrying screenshots.
- No data on document control or progress-report screenshot volume.

---

## 4. Time and clicks per screenshot

### Takeaway
No independent, peer-reviewed timing study found. Vendor estimates put a manual capture, annotate and paste flow at about 2 to 3 minutes when annotation is done properly, and about 8 steps; vendors claim 3 to 5 seconds hotkey-to-link for their own tools. All numbers are vendor estimates.

### Cited Findings
- Manual workflow breakdown: ~5 s capture, ~10 s locate file, ~15 s open editor, 60 to 120 s "quality annotation", ~30 s attach and send (total roughly 2 to 3 minutes). **[estimate, vendor blog]** — [Pixtel: screenshot chaos cost](https://www.pixtel.us/blogs/screenshot-chaos-cost)
- Typical capture-to-share path is at least 8 steps; vendor claims its tool cuts it to 3. **[vendor claim]** — [MangoApps: TinyTake vs Windows screen capture](https://www.mangoapps.com/articles/visual-aids-tiny-take-vs-windows-screen-capture)
- Zight reports 3 to 5 s hotkey-to-shareable-link for its tool and 30 to 45 s for Snagit in its own test. **[vendor claim, competitor comparison]** — [Zight: best screenshot app 2026](https://zight.com/blog/best-screenshot-app-2026/)
- An Alibaba "lifetips" page quotes precise timings (48.3 s to 18.1 s, 67% keyboard gain) attributed to a CMU study and an NN/g model; I could not verify the underlying studies. **Do not use.** **[unverified]** — [lifetips.alibaba.com](https://lifetips.alibaba.com/tech-efficiency/screenshots-with-snagit)
- Apple USPTO patents for screenshot editing describe fewer taps for markup and share, no measured numbers. **[patent]** — [USPTO 10783320](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10783320)

### Inferences
- The step count, not seconds, is the defensible comparison for Klik: Klik's SPEC click budget can be set against the "8 steps minimum" vendor baseline, with Klik's own count measured in the browser test.
- [estimate] If a user takes 10 work screenshots a day and the manual flow costs 60 to 150 s more than a one-hotkey flow, the saving is 10 to 25 minutes a day. Both inputs are estimates; label any such claim as a model, not a finding.

### Gaps
- No stopwatch or keystroke-logging study of real screenshot workflows (capture, annotate, paste into Teams/Jira/Word).
- No data on how often screenshots are annotated vs pasted raw.

---

## 5. Image share in workplace chat (Slack, Teams) and destinations

### Takeaway
No public statistic on the share of Slack or Teams messages that contain images or screenshots. Slack's admin analytics count files uploaded per workspace but publish no aggregate. Destination evidence is indirect: GitHub issues, BCF/Procore issues, email and chat are the documented places screenshots go.

### Cited Findings
- Slack's analytics dashboard reports "files uploaded" and messages sent per workspace, but not the share of messages carrying images; Slack's sharing docs list screenshots as a file type without usage figures. **[vendor documentation]** — [Slack help: analytics dashboard](https://slack.com/help/articles/360057638533); [Slack API: document sharing](https://api.slack.com/document-sharing)
- Third-party analytics (Count) offer file-sharing breakdowns by format (images, PDFs, code) on a customer's own Slack data; no benchmark published. **[vendor]** — [Count: Slack file sharing frequency](https://count.co/integration/slack/file-sharing-frequency)
- Flowcode (Jam customer) describes "a bunch of back and forth in Slack threads" with screenshots before adopting a bug tool. **[anecdote / vendor case study]** — [Jam: Flowcode](https://jam.dev/blog/how-flowcode-delivers-quality-to-65-million-people-saving-1000-debugging-hours-jam/)
- Construction teams split work across Procore, Bluebeam and email. **[vendor claim]** — [Nutrient construction research study](https://www.nutrient.io/research-study/construction/)

### Inferences
- A client's own Slack or Microsoft 365 admin data (files uploaded per user, image MIME types in Teams chats via Graph) could give a real per-person image-sharing rate inside one organisation. That would be measured data for a named client, with their permission, and would beat any public benchmark.
- Destinations for Klik's target users are likely Teams, Outlook, Word/PowerPoint reports and project tools; no source quantifies the split.

### Gaps
- No Microsoft Teams or Work Trend Index statistic on images in chat.
- No destination split (Teams vs email vs Jira vs Word) from any source.

---

## 6. Practitioner self-reports (anecdotal triangulation)

### Takeaway
Searches of Reddit and Hacker News did not surface threads with usable self-reported daily screenshot counts for the target roles. No anecdotal range can be given from this round.

### Cited Findings
- Reddit/Hacker News query for "screenshots a day" with developer, engineer or QA returned no relevant threads. **[search result, negative]** — [Hacker News search page returned](https://news.ycombinator.com/submitted?id=SerCe) (irrelevant)

### Inferences
- A targeted forum pass (r/QualityAssurance, r/sysadmin, r/Construction, r/projectmanagement, Snagit/ShareX forums, "ShareX history count") is the next step if an anecdotal range is wanted. ShareX keeps a local history file, so ShareX users sometimes post totals; worth searching.

### Gaps
- No anecdotal per-day range for any role. Any range in the final report must be [placeholder] until found.

---

## Summary table for the report writer

| Number | What it measures | Evidence type | Date |
|---|---|---|---|
| 17.10% of 481,603 GitHub issues contain images | Open-source issues, 34 repos | peer-reviewed, mining | 2017 to 2022 |
| 14.9% (2017) to 27.4% (2021) | Trend in visual issue share | peer-reviewed, mining | 2017 to 2021 |
| 15.67% of 50,988 Android bug reports | Images in bug reports | peer-reviewed, mining | published 2025 |
| 23.33% to 41.35% | Images in curated Android bug datasets | peer-reviewed | 2021 to 2023 datasets |
| 84.30% of reports with attachments had screenshots | Enterprise (bank software) tracker | peer-reviewed, industrial | 2019 |
| 95.18% of bug-report images are UI screenshots; 1.48 per report | Image content | peer-reviewed | published 2025 |
| 1 snapshot minimum per BIM issue | BCF / Procore rule | standard / vendor docs | current |
| 400 to 2,000 BIM issues per mid-size project | Issue volume | anecdote, practitioner blog | undated |
| ~8 steps; ~2 to 3 min manual capture-annotate-send | Workflow cost | vendor estimate | undated |
| 3 to 5 s hotkey-to-link | Vendor's own tool | vendor claim | 2026 |
| "5 screenshots per day" (US employees) | General | vendor survey, UNVERIFIED | unknown |
| Screenshots per day by role | n/a | **not found** | n/a |

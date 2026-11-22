# Markeringer bærer besparelsen, ikke selve screenshottet

Ingen har målt, hvor mange screenshots ingeniører, projektfolk, udviklere og testere tager om dagen og sætter ind i Teams, mail, Jira eller dokumenter. Vi har ikke fundet tal fra Microsoft, Apple, Google, TechSmith, Atlassian eller nogen forskningsartikel, der måler det for de roller. Det nærmeste er en amerikansk spørgeundersøgelse fra en softwareleverandør: **5 screenshots om dagen, selvrapporteret, med telefon og pc blandet** ([Smallpdf, 2025](https://smallpdf.com/blog/screenshotted-to-death)). Et lille forskningsstudie på pc fandt **cirka 2,3 om dagen**, men deltagerne blev bedt om at tage "et par stykker hver dag" ([Hu & Lee, UIST 2022](https://arxiv.org/pdf/2209.12318)). Vores skøn er derfor **3, 6 og 10 screenshots om dagen** for tre personas: projektleder, ingeniør og udvikler/tester. Det er skøn, ikke målinger. Det vigtigste for Klik-modellen er noget andet: et almindeligt screenshot ind i Teams tager lige så få trin i Windows' egen Win+Shift+S som i Klik. Besparelsen ligger i de screenshots, der får markeringer, i trinvejledninger, lange sider, video og genbrug. Modellen skal derfor regne på **andelen af screenshots, der bliver markeret**, og den andel har heller ingen målt.

## Ingen har målt screenshots pr. dag på arbejdet

Hullet er reelt. Den akademiske litteratur måler screenshots på telefoner i privatlivet, ikke på pc'er på arbejdet. Mottelson fra IT-Universitetet i København skriver, at der er "bemærkelsesværdigt få empiriske undersøgelser" af, hvorfor folk tager screenshots ([Mottelson, DIS 2023](http://aske.mottelson.dk/wp-content/uploads/2023/05/Mottelson2023b.pdf)). Hans 52 deltagere havde i snit 498,8 screenshots liggende på deres iPhone, men det er et lager uden tidsperiode, så det kan ikke blive til et tal pr. dag. Kun **24 % af telefon-screenshots blev taget for at dele** dem med andre. Mange studier, der nævner tusindvis af screenshots, tager dem automatisk hvert 5. sekund som forskningsværktøj. De siger intet om, hvor tit et menneske trykker på en tast ([Yang m.fl., CHI 2019](https://dl.acm.org/doi/fullHtml/10.1145/3290607.3313089)). Det samme gælder overvågningsværktøjer som Hubstaff, der kan tage op til 3 billeder pr. skærm hvert 10. minut ([Hubstaff](https://support.hubstaff.com/accessing-thumbnail-gallery-activity-page/)). Den slags tal puster "screenshots pr. dag" op på nettet og skal holdes ude.

De tre tal, der faktisk siger noget om en person, peger i forskellige retninger. Smallpdf spurgte **1.000 amerikanske fuldtidsansatte** og fik et gennemsnit på 5 om dagen. Metode, spørgsmålsformulering og indsamlingsdatoer er ikke oplyst, og **73 % gemmer screenshots i kamerarullen**, så tallet er mest telefonadfærd ([Smallpdf, 2025](https://smallpdf.com/blog/screenshotted-to-death)). Smallpdfs "1.800 om året" er blot 5 gange 365. Hu & Lees feltstudie gav **16,3 screenshots pr. person pr. uge** (fra 6 til 32) blandt 13 deltagere, mest kandidatstuderende, på macOS. Det er et gulv for en instrueret afprøvning, ikke en naturlig rate for fagfolk ([Hu & Lee, 2022](https://arxiv.org/pdf/2209.12318)). Gyazo oplyste i 2014 **13,02 mio. uploads og 3,75 mio. unikke brugere om måneden**, hvilket giver cirka 3,5 uploads pr. bruger pr. måned ([THE BRIDGE, 2014](https://thebridge.jp/2014/11/nota-gyazo-funding)). Det tal er lavt, fordi det kun tæller Gyazo-optagelser, og fordi nævneren kan omfatte folk, der kun ser links. Spændet fra under 1 om ugen til 5 om dagen viser, hvor lidt vi ved.

## Tre indirekte spor sætter rammen

Kopier og indsæt er godt målt på pc. To logningsstudier fandt **3 til 4 udklipsholder-handlinger i timen** for almindelige brugere i USA ([Stolee m.fl., VL/HCC 2009](https://kstolee.github.io/assets/papers/stolee_VLHCC2009.pdf)) og **5,3 pr. aktiv time** over 90 dage for 17 britiske, mest tekniske brugere ([Woodruff & Alexander, IJHCS 2019](https://www.jasonalexander.kiwi/pdf/IJHCS_DataTransfer.pdf)). Professionelle programmører lå omkring **16 kopier og indsæt i timen** ([Kim m.fl., ISESE 2004](https://research.ibm.com/publications/an-ethnographic-study-of-copy-and-paste-programming-practices-in-oopl), citeret i [Stolee 2009](https://kstolee.github.io/assets/papers/stolee_VLHCC2009.pdf)). Cirka **30 % af overførslerne krydser mellem programmer**. Et screenshot er næsten altid sådan en overførsel. Ved 6 til 8 aktive timer bliver det 20 til 40 handlinger om dagen. Det er vores omregning. Vigtigt: ingen af studierne målte billeder. Loggerne registrerede kun tekst og filer, så tallene viser, hvor travl udklipsholderen er, ikke hvor mange screenshots der går igennem den.

Softwarefolk efterlader spor i deres sager. I **481.603 GitHub-sager fra 34 store projekter havde 17,1 % billeder**, og andelen steg fra **14,9 % i 2017 til 27,4 % i 2021** ([Kuramoto m.fl., EMSE 2024](https://posl.ait.kyushu-u.ac.jp/~kamei/publications/Kuramoto_EMSE2024.pdf)). Sager med billeder lukkede hurtigere. I Android-fejlrapporter havde **15,67 % billeder, 95,18 % af dem var skærmbilleder af brugerfladen**, og der var i snit 1,48 billeder pr. rapport ([Wang m.fl., MSR 2025](https://arxiv.org/html/2502.15099v1)). Det eneste firmadata kommer fra en tyrkisk banks softwarehus: blandt 41.042 sager var der **screenshots i 84,3 % af dem med vedhæftninger**, og de sager havde færre ord ([Aktas m.fl., ICSE-SEIP 2020](https://arxiv.org/abs/2306.03634)). Det er andele af sager, ikke tal pr. person. Vi kender ikke, hvor mange sager en tester opretter om dagen.

Byggeri og energi har reglen, men ikke tællingen. Det åbne BIM-format BCF knytter et snapshot til hver sag ([buildingSMART BCF](https://github.com/BuildingSMART/BCF/blob/1d3ad49bced7f27135c5ce4ca6ac3591ad1057b8/Documentation/README.md)). Procores import af koordineringssager forventer mindst ét snapshot pr. sag ([Procore](https://support.procore.com/faq/how-can-i-prevent-import-errors-when-using-the-coordination-issues-tool)). En praktiker-blog anslår **400 til 2.000 BIM-sager i et mellemstort projekt** og hedder "Stop coordinating by screenshot", hvilket antyder, at screenshots i mail er udbredt ([Archgyan](https://archgyan.com/bcf-workflow-bim-issue-management/)). Over en designfase på cirka 200 arbejdsdage giver det 2 til 10 snapshots om dagen pr. projektteam. Det er regning på en anekdote. For vedvarende energi, produktion og anlæg fandt vi ingen kilder overhovedet.

## Tre personas: 3, 6 og 10 screenshots om dagen (skøn)

Alle tal i tabellen er **skøn**. Ingen af dem er målt for rollen. Kolonnen "Ankre" viser præcis, hvilke kilder der trækker skønnet op eller ned.

| Persona | Spænd pr. dag (skøn) | Punktværdi til modellen (skøn) | Andel markeret (skøn) | Ankre |
|---|---|---|---|---|
| **Projektleder** (få): status til styregruppe, en fejl i et system til IT, en tidsplan i Teams | 1 til 5 | **3** | **25 %** | Hu & Lee 2,3/dag på pc med instrueret adfærd (gulv). Smallpdf 5/dag selvrapporteret, telefon og pc blandet (loft). Gyazo 3,5/måned som lavt yderpunkt. Mottelson: kun 24 % af telefon-screenshots deles. |
| **Ingeniør der markerer tegninger og rapporter** (mellem): udsnit af tegning eller model med pile og cirkler til rådgiver, entreprenør eller rapport | 3 til 10 | **6** | **60 %** | BCF og Procore: mindst ét snapshot pr. BIM-sag. 400 til 2.000 sager pr. projekt giver 2 til 10 snapshots/dag pr. team (anekdote plus regning). Smallpdf 5/dag som generelt niveau. "Stop coordinating by screenshot" antyder mange ad hoc-screenshots i mail. |
| **Udvikler eller tester** (mange): fejl i brugerfladen til Jira, spørgsmål i Teams, før/efter i en pull request | 5 til 15 | **10** | **40 %** | 16 kopier og indsæt i timen for programmører (tekst, men viser høj overførselsrate). 17,1 % af GitHub-sager har billeder, stigende til 27,4 %. 1,48 billeder pr. fejlrapport, 95 % UI-screenshots. 84,3 % af firmasager med vedhæftning har screenshots. |

Projektlederens tal ligger tæt på de generelle kilder, fordi rollen ikke har en struktur, der kræver billeder. Ingeniørens andel markeret er højest, fordi et udsnit af en tegning sjældent giver mening uden en pil eller en cirkel. Det følger af BCF's design, ikke af en måling. Testeren tager flest, men mange er rene UI-billeder, der sættes direkte ind. Derfor er andelen markeret lavere end ingeniørens. Hu & Lees tal er det eneste målte pc-tal og ligger under alle tre punktværdier. Det taler for at præsentere 3, 6 og 10 som et "typisk travlt" scenarie og ikke som et gennemsnit for alle ansatte.

Ingen kilde, vi har fundet, måler, hvor mange screenshots der bliver markeret, før de sættes ind. Andelene 25 %, 60 % og 40 % er rene skøn og den mest usikre parameter i modellen. Henning bør justere dem efter egen erfaring.

## Et almindeligt screenshot sparer næsten ingen klik

Klik's egen spec sætter et almindeligt områdescreenshot ind i Teams til **Ctrl+Alt+K, træk, Ctrl+V** (docs/SPEC.md afsnit 4). Windows' indbyggede **Win+Shift+S, træk, Ctrl+V** er lige så kort. Et almindeligt screenshot sparer derfor cirka nul klik mod Windows. Specens test sammenligner med Snagit, ikke med Windows. Til et offentligt opslag er Windows den ærlige sammenligning, fordi det er det gratis alternativ, alle har.

Besparelsen opstår, når screenshottet skal mere end bare ind. Specens flow for et screenshot med trin 1 til 3 er **Ctrl+Alt+K, træk, A, 3 træk, Ctrl+V**. En 10-trins vejledning er hotkey, dine 10 klik, hotkey, altså **0 ekstra klik**. En lang side er hotkey og **1 klik** i vinduet. Video med indigo markør er hotkey, træk og hotkey. Genbrug af et ældre screenshot i Studio er **1 klik**. Hvor mange klik det samme kræver i Snipping Tool eller Snagit, har vi ikke talt. Leverandører anslår 2 til 3 minutter og mindst 8 trin for et manuelt forløb med optagelse, markering og afsendelse ([Pixtel](https://www.pixtel.us/blogs/screenshot-chaos-cost); [MangoApps](https://www.mangoapps.com/articles/visual-aids-tiny-take-vs-windows-screen-capture)), men det er uverificerede leverandørtal. Hennings egen optælling er bedre.

Modellen bliver derfor enkel. Tid sparet pr. år = screenshots pr. år × andel markeret × [klik sparet pr. markeret screenshot] × [sekunder pr. klik]. Almindelige screenshots tæller med nul. Trinvejledninger, lange sider og video lægges til som separate poster med deres eget antal pr. uge, fordi de ikke følger screenshot-tallet.

## Data til visualisering

Vi bruger **220 arbejdsdage om året**. Det er en antagelse (cirka 52 uger minus ferie og helligdage). Tallene kan ganges direkte med klik sparet pr. markeret screenshot.

| Persona | Screenshots/dag (skøn) | Arbejdsdage/år | Screenshots/år | Andel markeret (skøn) | Markerede screenshots/år | Klik sparet pr. markeret screenshot | Sekunder pr. klik |
|---|---|---|---|---|---|---|---|
| Projektleder | 3 (spænd 1 til 5) | 220 | 660 (220 til 1.100) | 25 % | 165 | [placeholder] | [placeholder] |
| Ingeniør, tegninger og rapporter | 6 (spænd 3 til 10) | 220 | 1.320 (660 til 2.200) | 60 % | 792 | [placeholder] | [placeholder] |
| Udvikler eller tester | 10 (spænd 5 til 15) | 220 | 2.200 (1.100 til 3.300) | 40 % | 880 | [placeholder] | [placeholder] |

Ekstra poster, som ikke følger screenshot-tallet:

| Post | Antal pr. uge pr. persona | Klik sparet pr. gang |
|---|---|---|
| Trinvejledning (10 trin) | [placeholder] | [placeholder] |
| Lang side | [placeholder] | [placeholder] |
| Video med markør | [placeholder] | [placeholder] |
| Genbrug af ældre screenshot | [placeholder] | [placeholder] |

## Evidenskvalitet for hvert tal

| Tal | Kilde | År | Stikprøve | Type | Verificeret |
|---|---|---|---|---|---|
| 5 screenshots/dag; 73 % i kamerarullen | [Smallpdf](https://smallpdf.com/blog/screenshotted-to-death) | 2025 | 1.000 amerikanske fuldtidsansatte | Spørgeskema, leverandør | Delvist. Én researcher læste siden; en anden kunne ikke åbne den. Metode ikke oplyst. |
| 16,3/uge, cirka 2,3/dag | [Hu & Lee, UIST](https://arxiv.org/pdf/2209.12318) | 2022 | 13, mest studerende, macOS, 1 uge | Peer-reviewed, instrueret adfærd | Ja, PDF læst |
| 3,5 uploads/bruger/måned (afledt) | [THE BRIDGE om Gyazo](https://thebridge.jp/2014/11/nota-gyazo-funding) | 2014 | 3,75 mio. månedlige brugere | Telemetri, gengivet i presse | Tal set; omregning er vores |
| 24 % af telefon-screenshots deles | [Mottelson, DIS](http://aske.mottelson.dk/wp-content/uploads/2023/05/Mottelson2023b.pdf) | 2023 | 52, mest USA, iPhone | Peer-reviewed | Ja, PDF læst |
| 3 til 4 udklipsholder-handlinger/time | [Stolee m.fl., VL/HCC](https://kstolee.github.io/assets/papers/stolee_VLHCC2009.pdf) | 2009 | 15, USA | Peer-reviewed, logning | Ja, PDF læst |
| 5,3/aktiv time; 30 % på tværs af programmer; billeder ikke målt | [Woodruff & Alexander, IJHCS](https://www.jasonalexander.kiwi/pdf/IJHCS_DataTransfer.pdf) | 2019 (data 2015) | 17, UK, mest tekniske | Peer-reviewed, logning | Ja, manuskript læst |
| Cirka 16 kopier og indsæt/time, programmører | [Kim m.fl., ISESE](https://research.ibm.com/publications/an-ethnographic-study-of-copy-and-paste-programming-practices-in-oopl) | 2004 | Cirka 5 programmører | Peer-reviewed, observation | Nej, kun citeret i to andre artikler |
| 17,1 % af 481.603 sager har billeder; 14,9 % til 27,4 % | [Kuramoto m.fl., EMSE](https://posl.ait.kyushu-u.ac.jp/~kamei/publications/Kuramoto_EMSE2024.pdf) | 2024 | 34 GitHub-projekter | Peer-reviewed, datamining | Ja, tabel 1 læst |
| 15,67 % billeder; 95,18 % UI; 1,48 pr. rapport | [Wang m.fl., MSR](https://arxiv.org/html/2502.15099v1) | 2025 | 50.988 Android-fejlrapporter | Peer-reviewed, datamining | Ja, HTML læst |
| 84,3 % af sager med vedhæftning har screenshots | [Aktas m.fl., ICSE-SEIP](https://arxiv.org/abs/2306.03634) | 2020 (data 2019) | 41.042 sager, bank | Peer-reviewed, industri | Delvist, samlet andel ikke bekræftet |
| Snapshot på hver BIM-sag | [buildingSMART BCF](https://github.com/BuildingSMART/BCF/blob/1d3ad49bced7f27135c5ce4ca6ac3591ad1057b8/Documentation/README.md) | Gældende | Ikke relevant | Standard | Ja |
| Mindst ét snapshot pr. importeret sag | [Procore](https://support.procore.com/faq/how-can-i-prevent-import-errors-when-using-the-coordination-issues-tool) | Gældende | Ikke relevant | Leverandørdokumentation | Ja |
| 400 til 2.000 BIM-sager pr. projekt | [Archgyan](https://archgyan.com/bcf-workflow-bim-issue-management/) | Udateret | Ingen | Anekdote, blog | Nej |
| 2 til 3 minutter manuelt forløb | [Pixtel](https://www.pixtel.us/blogs/screenshot-chaos-cost) | Udateret | Ingen | Leverandørskøn | Nej |
| Mindst 8 trin | [MangoApps](https://www.mangoapps.com/articles/visual-aids-tiny-take-vs-windows-screen-capture) | Udateret | Ingen | Markedsføringspåstand | Nej |
| 3, 6 og 10/dag; 25, 60 og 40 % markeret | Denne rapport | 2026 | Ingen | Skøn | Ikke relevant, skal mærkes som skøn |
| 220 arbejdsdage/år | Denne rapport | 2026 | Ingen | Antagelse | Ikke relevant |

## Påstande til LinkedIn: brug og undgå

**Sikre at bruge**, med kilde i opslaget eller i en kommentar:

1. "Vi har ikke kunnet finde én offentlig måling af, hvor mange screenshots ingeniører og udviklere tager om dagen."
2. "I 481.603 GitHub-sager havde 17 % billeder. Andelen steg fra 15 % i 2017 til 27 % i 2021." ([Kuramoto 2024](https://posl.ait.kyushu-u.ac.jp/~kamei/publications/Kuramoto_EMSE2024.pdf))
3. "I BIM-koordinering har hver sag et snapshot. Det står i det åbne BCF-format."
4. "Kontorfolk kopierer og indsætter 3 til 5 gange i timen ved computeren, viser to logningsstudier." ([Stolee 2009](https://kstolee.github.io/assets/papers/stolee_VLHCC2009.pdf); [Woodruff & Alexander 2019](https://www.jasonalexander.kiwi/pdf/IJHCS_DataTransfer.pdf))
5. "En amerikansk spørgeundersøgelse fra Smallpdf siger 5 screenshots om dagen. Selvrapporteret, telefon og pc blandet."
6. "Vores regneeksempel: en ingeniør med 6 screenshots om dagen tager cirka 1.300 om året. Det er et skøn."
7. "Et almindeligt screenshot er lige så hurtigt i Windows. Klik sparer tid, når du markerer, laver en vejledning eller genbruger."

**Undgå**:

1. "Ingeniører tager 10 screenshots om dagen" eller ethvert persona-tal fremstillet som målt.
2. "Klik sparer X timer om året" uden ordet "regneeksempel" og uden at nævne, at tallene er skøn.
3. "Ansatte tager 1.800 screenshots om året." Det er 5 gange 365, mest telefon og ikke arbejdsdage.
4. "Forskning viser 2,3 screenshots om dagen." Deltagerne blev bedt om at tage dem.
5. "Klik er hurtigere end Snipping Tool" om almindelige screenshots.
6. 134 kopier og indsæt om dagen (Pegasystems 2018). Kilden kunne ikke åbnes.
7. TechSmiths 1.200 dollar pr. ansat og "6 minutter og 43 sekunder om dagen". Leverandørbestilt, metode uklar.
8. Tal fra automatisk skærmoptagelse (Screenomics, Hubstaff, Windows Recall) og præcise tidsgevinster fra uverificerede sider.

## Konklusion

Det manglende tal er en mulighed. Ingen ejer svaret på "hvor mange screenshots tager en ingeniør", så Klik kan levere det første ærlige bud. Det billigste er, at Henning og to eller tre kunder fører en simpel streg-liste i én uge: antal screenshots, og om de blev markeret. Det giver et anekdotisk, men eget og åbent tal, der er stærkere end Smallpdf til et opslag. En lokal tæller i Klik, der kun deles, hvis brugeren selv vælger det, kan senere give rigtige tal uden at bryde løftet om, at intet forlader pc'en.

Den anden indsigt ændrer budskabet. Klik bør ikke sælge sig på "færre klik pr. screenshot", for det holder ikke mod Windows. Det holder på markerede screenshots, trinvejledninger og genbrug. Ingeniøren, der markerer tegninger, er derfor den stærkeste persona til opslaget: færre screenshots end testeren, men den højeste andel med markeringer og den klareste besparelse pr. stk.

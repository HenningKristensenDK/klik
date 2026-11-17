// The few words in Klik, in English, or Danish when Windows runs in Danish.

const en = {
  highlight: "Highlighter",
  arrow: "Numbered arrow",
  callout: "Arrow with comment",
  pen: "Pen",
  line: "Line",
  hintDrag: "Drag",
  hintDragRest: "to select",
  hintClick: "Click",
  hintClickRest: "= whole screen",
  hintEscRest: "= cancel",
  hintNext: "Next time: press",
  writeComment: "Write a comment",
  colour: "Colour",
  undo: "Undo  (Ctrl+Z)",
  discard: "Discard: delete the image and close",
  copied: "Copied",
  copying: "Copying…",
  copyFailed: "Could not copy",
  done: "Done",
  doneTitle: "Close. The image is already saved and copied  (Esc)",
  toast: "Saved and copied",
};

const da: typeof en = {
  highlight: "Marker",
  arrow: "Pil med nummer",
  callout: "Pil med kommentar",
  pen: "Frihånd",
  line: "Linje",
  hintDrag: "Træk",
  hintDragRest: "for at markere",
  hintClick: "Klik",
  hintClickRest: "= hele skærmen",
  hintEscRest: "= annullér",
  hintNext: "Næste gang: tryk",
  writeComment: "Skriv kommentar",
  colour: "Farve",
  undo: "Fortryd  (Ctrl+Z)",
  discard: "Kassér: slet billedet og luk",
  copied: "Kopieret",
  copying: "Kopierer…",
  copyFailed: "Kunne ikke kopiere",
  done: "Færdig",
  doneTitle: "Luk. Billedet er allerede gemt og kopieret  (Esc)",
  toast: "Gemt og kopieret",
};

const lang = (navigator.languages?.[0] ?? navigator.language ?? "en").toLowerCase();
export const t = lang.startsWith("da") ? da : en;

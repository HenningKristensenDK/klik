const P: Record<string, React.ReactNode> = {
  highlight: (
    <>
      <path d="M14.5 4.5l5 5L11 18H6v-5z" />
      <path d="M4 21h16" strokeWidth="3" stroke="#ffcc00" />
    </>
  ),
  arrow: (
    <>
      <circle cx="6.5" cy="17.5" r="3.5" />
      <path d="M9.5 14.5L19 5M12.5 5H19v6.5" />
    </>
  ),
  // Text with arrow: a plain T, since a speech bubble was not read as text
  // (Windows test 2026.11.27), plus a small arrow for "points at".
  callout: (
    <>
      <path d="M3 4h12M9 4v13" strokeWidth="2.4" />
      <path d="M14.5 14.5L20 20M20 15.5V20h-4.5" />
    </>
  ),
  pen: <path d="M4 18c3-1 4-6 7-6s2 5 5 5 3-5 4-7" />,
  line: <path d="M5 19L19 5" />,
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 010 12h-3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  studio: (
    <>
      <rect x="7" y="3.5" width="13" height="16" rx="2" />
      <path d="M4 7v12.5a2 2 0 002 2h9" />
    </>
  ),
};

export function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}

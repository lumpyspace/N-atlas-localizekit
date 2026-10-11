/** Small inline icon set (stroke icons, 24px grid). Decorative: aria-hidden. */

type P = { className?: string };

const Svg = ({ className = "h-4 w-4", children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {children}
  </svg>
);

export const IconHome = (p: P) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Svg>;
export const IconChat = (p: P) => <Svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></Svg>;
export const IconBeaker = (p: P) => <Svg {...p}><path d="M9 3h6" /><path d="M10 3v6L4.5 19A1.4 1.4 0 0 0 5.7 21h12.6a1.4 1.4 0 0 0 1.2-2L14 9V3" /><path d="M7.5 14h9" /></Svg>;
export const IconStore = (p: P) => <Svg {...p}><path d="M4 9 5.5 4h13L20 9" /><path d="M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11V9Z" /><path d="M5 13v8h14v-8" /></Svg>;
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IconX = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconArrowRight = (p: P) => <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>;
export const IconPlay = (p: P) => <Svg {...p}><path d="M7 5v14l11-7L7 5Z" /></Svg>;
export const IconShield = (p: P) => <Svg {...p}><path d="M12 3 5 6v6c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6l-7-3Z" /></Svg>;
export const IconDoc = (p: P) => <Svg {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" /></Svg>;
export const IconCode = (p: P) => <Svg {...p}><path d="m8 8-4 4 4 4M16 8l4 4-4 4" /></Svg>;
export const IconRefresh = (p: P) => <Svg {...p}><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 20v-4h-4" /></Svg>;
export const IconUser = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
export const IconAlert = (p: P) => <Svg {...p}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5v.01" /></Svg>;
export const IconChevron = (p: P) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;
export const IconStop = (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" /></Svg>;

/* global */
// Lightweight icon set — stroke-based, 16/20px, matches Figma/Linear vibe.
const Icon = ({ name, size = 16, style, ...rest }) => {
  const s = { width: size, height: size, flexShrink: 0, ...style };
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: s,
    ...rest,
  };
  switch (name) {
    case "logo":
      return (
        <svg {...props} viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 14h8M11 4v16" />
          <circle cx="16" cy="10" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chevron-down": return <svg {...props}><path d="M5 9l7 7 7-7" /></svg>;
    case "chevron-right": return <svg {...props}><path d="M9 5l7 7-7 7" /></svg>;
    case "chevron-left":  return <svg {...props}><path d="M15 5l-7 7 7 7" /></svg>;
    case "plus":          return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "minus":         return <svg {...props}><path d="M5 12h14" /></svg>;
    case "close":         return <svg {...props}><path d="M6 6l12 12M6 18L18 6" /></svg>;
    case "search":        return <svg {...props}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
    case "send":          return <svg {...props}><path d="M5 12l15-8-6 16-2-7-7-1z" /></svg>;
    case "image":         return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" /><path d="M3 16l5-4 4 3 3-2 6 5" /></svg>;
    case "crop":          return <svg {...props}><path d="M7 2v14a2 2 0 002 2h13M22 17H8a2 2 0 01-2-2V2" /></svg>;
    case "rectangle":     return <svg {...props}><rect x="4" y="6" width="16" height="12" rx="1.5" /></svg>;
    case "cursor":        return <svg {...props}><path d="M6 3l12 10-5 1 3 6-3 1-3-6-4 3V3z" fill="currentColor" stroke="none" /></svg>;
    case "hand":          return <svg {...props}><path d="M7 11V6a1.5 1.5 0 113 0v5M10 11V5a1.5 1.5 0 113 0v6M13 11V6a1.5 1.5 0 113 0v6M16 9a1.5 1.5 0 013 0v5a6 6 0 01-6 6 6 6 0 01-6-6v-2c0-1 .5-2 1.5-2" /></svg>;
    case "zoom-in":       return <svg {...props}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M11 8v6M8 11h6" /></svg>;
    case "zoom-out":      return <svg {...props}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M8 11h6" /></svg>;
    case "fit":           return <svg {...props}><path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 20H4v-4" /></svg>;
    case "folder":        return <svg {...props}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>;
    case "archive":       return <svg {...props}><path d="M3 6h18v3H3zM5 9v11a1 1 0 001 1h12a1 1 0 001-1V9M10 13h4" /></svg>;
    case "file":          return <svg {...props}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" /><path d="M14 3v6h6" /></svg>;
    case "pdf":           return <svg {...props}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" /><path d="M14 3v6h6" /></svg>;
    case "settings":      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1A2 2 0 013.4 17l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H2a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1A2 2 0 016 3.4l.1.1a1.7 1.7 0 001.8.3H8a1.7 1.7 0 001-1.5V2a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V8a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    case "book":          return <svg {...props}><path d="M4 4v16a1 1 0 001 1h15V3H5a1 1 0 00-1 1zM4 17h16" /></svg>;
    case "chat":          return <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
    case "download":      return <svg {...props}><path d="M12 3v12M6 11l6 6 6-6M4 21h16" /></svg>;
    case "upload":        return <svg {...props}><path d="M12 21V9M6 13l6-6 6 6M4 3h16" /></svg>;
    case "play":          return <svg {...props}><path d="M6 4l14 8-14 8V4z" fill="currentColor" /></svg>;
    case "pencil":        return <svg {...props}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
    case "trash":         return <svg {...props}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" /></svg>;
    case "copy":          return <svg {...props}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>;
    case "check":         return <svg {...props}><path d="M5 12l5 5 9-10" /></svg>;
    case "dots":          return <svg {...props}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></svg>;
    case "drag":          return <svg {...props}><circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" /></svg>;
    case "queue":         return <svg {...props}><path d="M4 6h13M4 12h13M4 18h9M19 16v6M16 19h6" /></svg>;
    case "lock":          return <svg {...props}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>;
    case "user":          return <svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>;
    case "globe":         return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z" /></svg>;
    case "eye":           return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "eye-off":       return <svg {...props}><path d="M3 3l18 18M10.5 6.1A10 10 0 0112 6c6 0 10 6 10 6a14 14 0 01-3 3.5M6 6.5A14 14 0 002 12s4 6 10 6a9 9 0 004-.9" /><path d="M9.9 9.9a3 3 0 104.2 4.2" /></svg>;
    case "type":          return <svg {...props}><path d="M4 7V5h16v2M9 5v14M15 5v14M7 19h4M13 19h4" /></svg>;
    case "paint":         return <svg {...props}><path d="M4 8h16v4a2 2 0 01-2 2h-1v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4H8a2 2 0 01-2-2v-1" /><path d="M4 8V6a2 2 0 012-2h12" /></svg>;
    case "layers":        return <svg {...props}><path d="M12 3l10 5-10 5L2 8l10-5zM2 13l10 5 10-5M2 18l10 5 10-5" /></svg>;
    case "grid":          return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case "sparkle":       return <svg {...props}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" /></svg>;
    case "panel-right":   return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M14 4v16" /></svg>;
    case "panel-bottom":  return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 14h18" /></svg>;
    case "sidebar":       return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>;
    case "keyboard":      return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>;
    case "info":          return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></svg>;
    case "check-circle":  return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>;
    case "bolt":          return <svg {...props}><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" /></svg>;
    case "reading":       return <svg {...props}><path d="M4 5h7a2 2 0 012 2v13M20 5h-7a2 2 0 00-2 2v13M3 5v15h18V5" /></svg>;
    case "wand":          return <svg {...props}><path d="M15 4v2M18 6l1.5-1.5M20 10h2M6 20L3 23M15 4l-11 11a2 2 0 000 3l2 2a2 2 0 003 0L20 9" /></svg>;
    default: return null;
  }
};

Object.assign(window, { Icon });

// components/RunicDivider.tsx
// Norse runic section divider with knotwork-style SVG and rune characters.

interface RunicDividerProps {
  runes?: string;
  className?: string;
}

export default function RunicDivider({
  runes = "ᚱᚷᚾ",
  className = "",
}: RunicDividerProps) {
  return (
    <div
      className={`nrs-divider ${className}`}
      role="separator"
      aria-hidden="true"
    >
      {/* Left knotwork SVG */}
      <svg width="60" height="16" viewBox="0 0 60 16" fill="none" aria-hidden="true">
        <path
          d="M0 8 C10 2, 20 14, 30 8 C40 2, 50 14, 60 8"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.6"
          fill="none"
        />
        <path
          d="M0 8 C10 14, 20 2, 30 8 C40 14, 50 2, 60 8"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeOpacity="0.3"
          fill="none"
          strokeDasharray="4 3"
        />
      </svg>

      {/* Diamond accent */}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <polygon
          points="4,0 8,4 4,8 0,4"
          fill="currentColor"
          fillOpacity="0.7"
        />
      </svg>

      {/* Rune text */}
      <span
        style={{
          fontFamily:    "serif",
          fontSize:      "1rem",
          letterSpacing: "0.2em",
          opacity:       0.75,
          userSelect:    "none",
        }}
      >
        {runes}
      </span>

      {/* Diamond accent */}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <polygon
          points="4,0 8,4 4,8 0,4"
          fill="currentColor"
          fillOpacity="0.7"
        />
      </svg>

      {/* Right knotwork SVG (mirrored) */}
      <svg width="60" height="16" viewBox="0 0 60 16" fill="none" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
        <path
          d="M0 8 C10 2, 20 14, 30 8 C40 2, 50 14, 60 8"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.6"
          fill="none"
        />
        <path
          d="M0 8 C10 14, 20 2, 30 8 C40 14, 50 2, 60 8"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeOpacity="0.3"
          fill="none"
          strokeDasharray="4 3"
        />
      </svg>
    </div>
  );
}

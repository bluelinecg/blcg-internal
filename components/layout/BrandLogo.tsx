// Inline SVG reproduction of the Blue Line Consulting Group logo mark.
// Renders without a network request and scales cleanly at any size.
//
// When the production vector file is available:
//   1. Drop logo-light.svg and logo-dark.svg into /public/
//   2. Replace this component body with a next/image using BRAND.logo[variant]
//
// Props:
//   variant — 'light' (white mark, for dark backgrounds like the sidebar)
//              'dark'  (navy mark, for light backgrounds)
//   width   — rendered width in px; height scales proportionally from viewBox

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  width?: number;
}

const COLORS = {
  light: {
    wordmark: '#FFFFFF',
    subtitle: '#8BACC8',
    rule: '#8BACC8',
    ring: '#8BACC8',
    dot: '#2B6DB5',
  },
  dark: {
    wordmark: '#1C2D44',
    subtitle: '#6B7280',
    rule: '#8BACC8',
    ring: '#8BACC8',
    dot: '#2B6DB5',
  },
} as const;

export function BrandLogo({ variant = 'light', width = 148 }: BrandLogoProps) {
  const c = COLORS[variant];

  return (
    <svg
      width={width}
      viewBox="0 0 200 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Blue Line Consulting Group"
      role="img"
    >
      {/* BLUE LINE wordmark */}
      <text
        x="100"
        y="19"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="21"
        letterSpacing="5"
        fill={c.wordmark}
      >
        BLUE LINE
      </text>

      {/* Left rule */}
      <line x1="6" y1="32" x2="80" y2="32" stroke={c.rule} strokeWidth="0.75" />

      {/* Outer ring */}
      <circle cx="100" cy="32" r="10.5" stroke={c.ring} strokeWidth="0.75" fill="none" />

      {/* Inner dot */}
      <circle cx="100" cy="32" r="5.5" fill={c.dot} />

      {/* Right rule */}
      <line x1="120" y1="32" x2="194" y2="32" stroke={c.rule} strokeWidth="0.75" />

      {/* CONSULTING GROUP subtitle */}
      <text
        x="100"
        y="50"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight="400"
        fontSize="7"
        letterSpacing="3.5"
        fill={c.subtitle}
      >
        CONSULTING GROUP
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND CONFIGURATION — single source of truth for all brand identity values.
//
// To rebrand for a new client project:
//   1. Replace the values in this file
//   2. Update the @theme block in app/globals.css with matching color hex values
//   3. Drop new logo files into /public and update the logo paths below
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = {
  // Company identity
  name: 'Blue Line Consulting Group',
  shortName: 'BLCG',
  appName: 'BLCG Internal',

  // Application metadata
  url: 'https://admin.bluelinecg.com',
  supportEmail: 'hello@bluelinecg.com',

  // Logo paths — place files in /public
  // Use logo.light for dark backgrounds, logo.dark for light backgrounds.
  // When the real SVG file is available, drop it into /public and update these paths.
  // The BrandLogo component renders an inline SVG fallback until then.
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  },

  // Color palette — mirrors the CSS custom properties in app/globals.css @theme.
  // Use these values in non-Tailwind contexts (meta tags, canvas, email templates).
  // For Tailwind usage, use the generated classes: bg-brand-navy, text-brand-blue, etc.
  colors: {
    navy: '#1C2D44',   // primary dark — sidebar background, headings
    blue: '#2B6DB5',   // accent — buttons, active states, the logo dot
    steel: '#8BACC8',  // secondary — logo rule lines/rings, subtle accents
  },
} as const;

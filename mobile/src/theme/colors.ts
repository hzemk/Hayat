export const lightColors = {
  brand: {
    primary: '#14B8A6',
    primaryDark: '#0D9488',
    primaryLight: '#2DD4BF',
    accent: '#E63946',
    gradient: ['#2DD4BF', '#14B8A6', '#0D9488'] as readonly [string, string, string],
    // Chrome for elements on the brand gradient (always saturated, same
    // values in light and dark).
    overlay: 'rgba(255,255,255,0.22)',
    overlayStrong: 'rgba(255,255,255,0.32)',
    overlaySoft: 'rgba(255,255,255,0.18)',
    onMuted: 'rgba(255,255,255,0.85)',
    onMutedSoft: 'rgba(255,255,255,0.7)',
    // Text / icon on solid brand-colored surfaces — always white.
    on: '#FFFFFF',
    // Jordan's Sanad digital-ID brand colors — not theme-contextual.
    sanad: { bg: '#000000', fg: '#FFFFFF' },
  },
  emergency: {
    base: '#DC2626',
    pressed: '#991B1B',
    // Text / icon color on emergency-red surfaces — always white.
    on: '#FFFFFF',
  },
  // Modal/overlay scrims — translucent black backdrops. Same values in both
  // themes (scrim is a UX function, not a palette).
  scrim: {
    base: 'rgba(0,0,0,0.4)',
    strong: 'rgba(0,0,0,0.55)',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
  },
  surface: {
    base: '#FFFFFF',
    raised: '#F8FAFC',
    sunken: '#F1F5F9',
    border: '#E2E8F0',
  },
  status: {
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
  tint: {
    teal: { bg: '#CCFBF1', fg: '#0D9488' },
    red: { bg: '#FEE2E2', fg: '#DC2626' },
    rose: { bg: '#FFE4E6', fg: '#BE123C' },
    yellow: { bg: '#FEF3C7', fg: '#B45309' },
    green: { bg: '#D1FAE5', fg: '#047857' },
    blue: { bg: '#DBEAFE', fg: '#1D4ED8' },
    purple: { bg: '#EDE9FE', fg: '#6D28D9' },
    gray: { bg: '#F1F5F9', fg: '#475569' },
  },
};

export const darkColors: typeof lightColors = {
  brand: {
    primary: '#22D3EE',
    primaryDark: '#0EA5E9',
    primaryLight: '#5EEAD4',
    accent: '#F87171',
    gradient: ['#5EEAD4', '#22D3EE', '#0EA5E9'] as readonly [string, string, string],
    overlay: 'rgba(255,255,255,0.22)',
    overlayStrong: 'rgba(255,255,255,0.32)',
    overlaySoft: 'rgba(255,255,255,0.18)',
    onMuted: 'rgba(255,255,255,0.85)',
    onMutedSoft: 'rgba(255,255,255,0.7)',
    on: '#FFFFFF',
    sanad: { bg: '#000000', fg: '#FFFFFF' },
  },
  emergency: {
    base: '#EF4444',
    pressed: '#DC2626',
    on: '#FFFFFF',
  },
  scrim: {
    base: 'rgba(0,0,0,0.4)',
    strong: 'rgba(0,0,0,0.55)',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#CBD5E1',
    muted: '#64748B',
    inverse: '#020617',
  },
  surface: {
    base: '#0F172A',
    raised: '#020617',
    sunken: '#1E293B',
    border: '#1E293B',
  },
  status: {
    success: '#10B981',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
  tint: {
    teal: { bg: 'rgba(20,184,166,0.15)', fg: '#5EEAD4' },
    red: { bg: 'rgba(220,38,38,0.18)', fg: '#FCA5A5' },
    rose: { bg: 'rgba(190,18,60,0.18)', fg: '#FDA4AF' },
    yellow: { bg: 'rgba(180,83,9,0.18)', fg: '#FCD34D' },
    green: { bg: 'rgba(16,185,129,0.15)', fg: '#6EE7B7' },
    blue: { bg: 'rgba(37,99,235,0.18)', fg: '#93C5FD' },
    purple: { bg: 'rgba(109,40,217,0.18)', fg: '#C4B5FD' },
    gray: { bg: 'rgba(100,116,139,0.18)', fg: '#CBD5E1' },
  },
};

// Backwards-compatible export — most screens still import `colors` directly
// and render in light mode. Themed screens use `useTheme()` from ThemeContext.
export const colors = lightColors;

export type Tint = keyof typeof lightColors.tint;
export type AppColors = typeof lightColors;
export type ThemeMode = 'light' | 'dark';

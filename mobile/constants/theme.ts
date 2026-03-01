/**
 * Flot Design System — Revolut-inspired
 * Centralized theme tokens for the entire mobile app
 */

export const colors = {
  // Brand
  brand: '#2E7D32',
  brandLight: '#E8F5E9',
  brandDark: '#1B5E20',

  // Backgrounds
  bg: '#F5F6FA',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgDark: '#191B25',
  bgDarkHover: '#252733',

  // Text
  ink: '#1A1D2B',
  inkSecondary: '#6E7491',
  inkMuted: '#A0A4B8',
  inkFaint: '#C8CAD4',
  inkOnDark: '#FFFFFF',

  // Borders
  border: '#E8E9EE',
  borderLight: '#F0F1F5',
  borderInput: '#DFE0E6',

  // Status
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const },
  bodySemibold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  kpi: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

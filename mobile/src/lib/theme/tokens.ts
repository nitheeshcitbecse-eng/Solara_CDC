export const colors = {
  plum: '#3B1631', plumDeep: '#170912', primary: '#C2410C', primaryPressed: '#9A330A', gold: '#F6B53D',
  background: '#FFF8F1', surface: '#FFFFFF', surfaceMuted: '#F7EDE3', surfaceSelected: '#FFF4EA',
  border: '#F2E1D1', borderStrong: '#EDD5C2',
  text: '#2B1712', textMuted: '#5B4438', textSubtle: '#7A5F50', textOnDark: '#FFFFFF', textOnDarkMuted: '#F4E4DC',
  success: '#0B7A5E', successSoft: '#DFF3EC', warning: '#7C4A03', warningSoft: '#FEF1C7',
  danger: '#B42332', dangerSoft: '#FBE6E8',
} as const;
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;
export const MIN_TOUCH = 44;
// Status mapping (reuse everywhere): Applied=surfaceMuted/textMuted, Shortlisted=warningSoft/warning,
// Hired=successSoft/success, Rejected=dangerSoft/danger. Rating: Easy=success, Moderate=warning, Hard=danger.

export type ColorToken = keyof typeof colors;

/** Translucent colours for content laid over photography and modal scrims. */
export const overlays = {
  scrim: 'rgba(23, 9, 18, 0.55)',
  heroFadeStart: 'rgba(23, 9, 18, 0)',
  heroFadeEnd: 'rgba(23, 9, 18, 0.82)',
  outlineLightBg: 'rgba(23, 9, 18, 0.32)',
  outlineLightBorder: 'rgba(255, 255, 255, 0.72)',
  glass: 'rgba(255, 255, 255, 0.16)',
  pressedOnDark: 'rgba(255, 255, 255, 0.12)',
  meterIdle: 'rgba(194, 65, 12, 0.18)',
} as const;

/** Pressed shades that aren't part of the core palette. */
export const pressedColors = {
  danger: '#931C29',
  surface: colors.surfaceMuted,
  plain: colors.surfaceMuted,
} as const;

/** Fixed component dimensions shared across the design system. */
export const sizes = {
  buttonHeight: 54,
  inputHeight: 54,
  icon: 20,
  iconSm: 16,
  iconLg: 24,
  iconTile: 44,
  avatarSm: 36,
  avatarMd: 48,
  avatarLg: 72,
  hairline: 1,
  focusRing: 2,
  otpBox: 48,
  badgeDot: 8,
  sheetHandleWidth: 40,
  sheetHandleHeight: 4,
  sideSheetWidth: 300,
  meterBarWidth: 4,
  meterHeight: 40,
  progressHeight: 6,
  chartHeight: 140,
  heroAspect: 16 / 9,
  photoThumb: 96,
  logo: 32,
  logoLg: 56,
  chip: 38,
  listRow: 56,
  textAreaMin: 120,
  toastOffset: 88,
  timelineDot: 12,
  pickerRow: 48,
  pickerHeight: 240,
} as const;

/** Shadows are kept subtle: the visual language relies on borders, not elevation. */
export const shadows = {
  card: {
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sheet: {
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;

export const durations = { fast: 150, normal: 220, toast: 3200 } as const;

/** Respect the user's system font size, but cap it so layouts stay usable. */
export const MAX_FONT_SCALE = 1.6;

export const statusColors = {
  applied: { background: colors.surfaceMuted, foreground: colors.textMuted },
  shortlisted: { background: colors.warningSoft, foreground: colors.warning },
  hired: { background: colors.successSoft, foreground: colors.success },
  rejected: { background: colors.dangerSoft, foreground: colors.danger },
} as const;

export const difficultyColors = {
  easy: { background: colors.successSoft, foreground: colors.success },
  moderate: { background: colors.warningSoft, foreground: colors.warning },
  hard: { background: colors.dangerSoft, foreground: colors.danger },
} as const;

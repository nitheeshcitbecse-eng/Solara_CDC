import colors from "../colors";

// Three looks: Normal (daily work) sunrise orange, Premium (professionals) ink + gold, Admin deep jade.
// `gradient` runs light → dark and is used for the sidebar header and to shade the bottom of photo headers.
const THEMES = {
  normal: {
    name: "normal",
    label: "Normal",
    gradient: ["#9a3412", "#5a1f0b", "#1f1209"],
    accent: colors.primary,
    accentSoft: colors.primarySoft,
    accentDark: colors.primaryDark,
    button: colors.primary,
    buttonText: "#ffffff",
    background: colors.background,
    onGradient: "#ffffff",
    onGradientSoft: "#fde3cf",
  },
  premium: {
    name: "premium",
    label: "Premium",
    gradient: ["#3a3128", colors.premiumInkLight, "#12100e"],
    accent: colors.premiumGold,
    accentSoft: colors.premiumGoldSoft,
    accentDark: colors.premiumInk,
    button: colors.premiumInk,
    buttonText: "#ffffff",
    background: colors.premiumIvory,
    onGradient: "#ffffff",
    onGradientSoft: colors.premiumGoldBright,
  },
  admin: {
    name: "admin",
    label: "Admin",
    gradient: ["#1f5a43", "#143b2d", colors.adminGreenDark],
    accent: colors.adminGreen,
    accentSoft: colors.adminGreenSoft,
    accentDark: colors.adminGreenDark,
    button: colors.adminGreen,
    buttonText: "#ffffff",
    background: "#f5f5f2",
    onGradient: "#ffffff",
    onGradientSoft: "#bfe3d2",
  },
};

// Accepts a tier ("normal" | "premium") or "admin".
export default function tierTheme(name) {
  return THEMES[name] || THEMES.normal;
}

export function themeForUser(user) {
  if (!user) return THEMES.normal;
  return user.role === "admin" ? THEMES.admin : tierTheme(user.tier);
}

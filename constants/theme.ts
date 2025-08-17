export type AppTheme = {
  background: string;
  surface: string;
  surfaceStrong: string;
  textPrimary: string;
  textSecondary: string;
  accentCyan: string;
  accentPink: string;
  accentLime: string;
  accentAmber: string;
  border: string;
  gradientHeader: [string, string];
  gradientCTA: [string, string];
  card: string;
  cardBorder: string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

export const lightTheme: AppTheme = {
  background: "#FFFFFF",
  surface: "#F9FAFB",
  surfaceStrong: "#F3F4F6",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  accentCyan: "#06B6D4",
  accentPink: "#EC4899",
  accentLime: "#65A30D",
  accentAmber: "#D97706",
  border: "#E5E7EB",
  gradientHeader: ["#F9FAFB", "#FFFFFF"],
  gradientCTA: ["#06B6D4", "#EC4899"],
  card: "#FFFFFF",
  cardBorder: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

export const darkTheme: AppTheme = {
  background: "#0B0520",
  surface: "#130A2E",
  surfaceStrong: "#1B0F3B",
  textPrimary: "#F8FAFF",
  textSecondary: "#B9B7D3",
  accentCyan: "#21D4FD",
  accentPink: "#FF3D9A",
  accentLime: "#71FF6B",
  accentAmber: "#FFC15A",
  border: "#2B1E55",
  gradientHeader: ["#1F0B49", "#0B0520"],
  gradientCTA: ["#21D4FD", "#FF3D9A"],
  card: "#1B0F3B",
  cardBorder: "#2B1E55",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

export const neonTheme = darkTheme;

// Comprehensive theme for the app
export const theme = {
  colors: {
    primary: "#007AFF",
    secondary: "#5856D6",
    background: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E5EA",
    surface: "#F9FAFB",
    white: "#FFFFFF",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    text: {
      primary: "#000000",
      secondary: "#6D6D70",
    },
    gray: {
      50: "#F9FAFB",
      100: "#F3F4F6",
      200: "#E5E7EB",
      300: "#D1D5DB",
      400: "#9CA3AF",
      500: "#6B7280",
      600: "#4B5563",
      700: "#374151",
      800: "#1F2937",
      900: "#111827",
    },
    blue: {
      50: "#EFF6FF",
      100: "#DBEAFE",
      200: "#BFDBFE",
      300: "#93C5FD",
      400: "#60A5FA",
      500: "#3B82F6",
      600: "#2563EB",
      700: "#1D4ED8",
      800: "#1E40AF",
      900: "#1E3A8A",
    },
    green: {
      50: "#F0FDF4",
      100: "#DCFCE7",
      200: "#BBF7D0",
      300: "#86EFAC",
      400: "#4ADE80",
      500: "#22C55E",
      600: "#16A34A",
      700: "#15803D",
      800: "#166534",
      900: "#14532D",
    },
    red: {
      50: "#FEF2F2",
      100: "#FEE2E2",
      200: "#FECACA",
      300: "#FCA5A5",
      400: "#F87171",
      500: "#EF4444",
      600: "#DC2626",
      700: "#B91C1C",
      800: "#991B1B",
      900: "#7F1D1D",
    },
    purple: {
      50: "#FAF5FF",
      100: "#F3E8FF",
      200: "#E9D5FF",
      300: "#D8B4FE",
      400: "#C084FC",
      500: "#A855F7",
      600: "#9333EA",
      700: "#7C3AED",
      800: "#6B21A8",
      900: "#581C87",
    },
    gold: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B",
      600: "#D97706",
      700: "#B45309",
      800: "#92400E",
      900: "#78350F",
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
};

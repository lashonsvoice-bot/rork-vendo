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
  accentBrown: string;
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
  accentBrown: "#8B4513",
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
  background: "#1A0B3D",
  surface: "#2D1B5E",
  surfaceStrong: "#3D2470",
  textPrimary: "#FFFFFF",
  textSecondary: "#C4B5FD",
  accentCyan: "#00E5FF",
  accentPink: "#FF4081",
  accentLime: "#00FF88",
  accentAmber: "#FFD700",
  accentBrown: "#A0522D",
  border: "#4C1D95",
  gradientHeader: ["#2D1B5E", "#1A0B3D"],
  gradientCTA: ["#00E5FF", "#FF4081"],
  card: "#2D1B5E",
  cardBorder: "#4C1D95",
  success: "#00FF88",
  warning: "#FFD700",
  error: "#FF4081",
  info: "#00E5FF",
};

// RevoVend Neon Theme - matches the logo aesthetic
export const revoVendTheme: AppTheme = {
  background: "#1A0B3D", // Deep purple from logo background
  surface: "#2D1B5E", // Slightly lighter purple
  surfaceStrong: "#3D2470", // Medium purple for elevated surfaces
  textPrimary: "#FFFFFF", // Pure white for primary text
  textSecondary: "#C4B5FD", // Light purple for secondary text
  accentCyan: "#00E5FF", // Bright neon cyan from logo
  accentPink: "#FF4081", // Bright neon pink/coral from logo
  accentLime: "#00FF88", // Bright neon green from logo
  accentAmber: "#FFD700", // Bright gold accent
  accentBrown: "#8B4513", // Brown for ambassador program
  border: "#4C1D95", // Purple border
  gradientHeader: ["#2D1B5E", "#1A0B3D"], // Purple gradient
  gradientCTA: ["#00E5FF", "#FF4081"], // Cyan to pink gradient
  card: "#2D1B5E", // Card background
  cardBorder: "#4C1D95", // Card border
  success: "#00FF88", // Neon green for success
  warning: "#FFD700", // Gold for warnings
  error: "#FF4081", // Neon pink for errors
  info: "#00E5FF", // Neon cyan for info
};

export const neonTheme = revoVendTheme;

// Comprehensive theme for the app - RevoVend Edition
export const theme = {
  colors: {
    primary: "#00E5FF", // Neon cyan
    secondary: "#FF4081", // Neon pink
    background: "#1A0B3D", // Deep purple
    card: "#2D1B5E", // Purple card
    border: "#4C1D95", // Purple border
    surface: "#2D1B5E", // Purple surface
    white: "#FFFFFF",
    success: "#00FF88", // Neon green
    warning: "#FFD700", // Gold
    error: "#FF4081", // Neon pink
    info: "#00E5FF", // Neon cyan
    text: {
      primary: "#FFFFFF", // White text
      secondary: "#C4B5FD", // Light purple text
    },
    // Neon glow colors for special effects
    neon: {
      cyan: "#00E5FF",
      pink: "#FF4081",
      green: "#00FF88",
      gold: "#FFD700",
      purple: "#8B5CF6",
    },
    // Glow shadows for neon effects
    glow: {
      cyan: "0 0 20px #00E5FF40",
      pink: "0 0 20px #FF408140",
      green: "0 0 20px #00FF8840",
      gold: "0 0 20px #FFD70040",
      purple: "0 0 20px #8B5CF640",
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
    orange: {
      50: "#FFF7ED",
      100: "#FFEDD5",
      200: "#FED7AA",
      300: "#FDBA74",
      400: "#FB923C",
      500: "#F97316",
      600: "#EA580C",
      700: "#C2410C",
      800: "#9A3412",
      900: "#7C2D12",
    },
    brown: {
      50: "#FDF5E6",
      100: "#F5DEB3",
      200: "#DEB887",
      300: "#D2691E",
      400: "#CD853F",
      500: "#8B4513",
      600: "#A0522D",
      700: "#964B00",
      800: "#654321",
      900: "#3E2723",
    },
    ambassador: "#8B4513",
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

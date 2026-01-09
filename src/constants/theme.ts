export const PALETTE = {
  light: {
    background: '#F5F5F7',
    surface: '#FFFFFF',
    primary: '#FF3B30', // Softened Red
    secondary: '#5856D6', // Purple-ish for secondary actions
    textPrimary: '#1C1C1E',
    textSecondary: '#6E6E73',
    border: 'rgba(0,0,0,0.08)',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    inputBackground: '#FFFFFF',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    primary: '#FF453A', // Slightly brighter Red for dark mode
    secondary: '#5E5CE6',
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: 'rgba(255,255,255,0.12)',
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    inputBackground: '#1C1C1E',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
  },
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 11,
  s: 13,
  m: 17, // Standard iOS body size
  l: 20,
  xl: 28, // Large titles
  xxl: 34,
};

export const BORDER_RADIUS = {
  s: 8,
  m: 12,
  l: 20,
  xl: 32,
  round: 9999,
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

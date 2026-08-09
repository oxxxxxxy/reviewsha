export const colors = {
  primary: '#2563eb',
  secondary: '#475569',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  surfaceMuted: '#f1f5f9',
  error: '#dc2626',
  border: '#e2e8f0',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
} as const;

export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
} as const;

export const typography = {
  fontFamily: 'Inter, system-ui, sans-serif',
  sizes: {
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
} as const;

export const shadows = {
  sm: '0 1px 2px rgb(15 23 42 / 0.08)',
  md: '0 8px 24px rgb(15 23 42 / 0.12)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  breakpoints,
} as const;

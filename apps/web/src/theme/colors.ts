/**
 * Nama token desain untuk pemakaian di TS (nilai aktual ada di `theme.css`).
 * Jangan menduplikasi nilai warna di sini — selalu rujuk variabel CSS.
 */
export const colors = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  popover: "var(--popover)",
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  primaryDeep: "var(--primary-deep)",
  primarySoft: "var(--primary-soft)",
  secondary: "var(--secondary)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  accent: "var(--accent)",
  accentForeground: "var(--accent-foreground)",
  destructive: "var(--destructive)",
  success: "var(--success)",
  warning: "var(--warning)",
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",
  sidebar: "var(--sidebar)",
  sidebarForeground: "var(--sidebar-foreground)",
  sidebarPrimary: "var(--sidebar-primary)",
  sidebarAccent: "var(--sidebar-accent)",
  whatsapp: "var(--whatsapp)",
  warningStrong: "var(--warning-strong)",
  successStrong: "var(--success-strong)",
} as const;

export type ColorToken = keyof typeof colors;

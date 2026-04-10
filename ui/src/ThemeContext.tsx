import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  headerBg: string;
  headerText: string;
  headerSub: string;
  scenarioBg: string;
  logBg: string;
  logBorder: string;
  scrollThumb: string;
  cardStroke: string;
  laneHeaderBg: string;
  laneHeaderOpacity: number;
  tooltipBg: string;
}

const DRACULA: ThemeColors = {
  bg: '#282a36',
  bgSecondary: '#1e1f29',
  bgCard: 'rgba(68,71,90,0.7)',
  bgCardHover: 'rgba(68,71,90,0.9)',
  text: '#f8f8f2',
  textSecondary: '#bd93f9',
  textMuted: '#6272a4',
  border: '#44475a',
  accent: '#bd93f9',
  headerBg: 'linear-gradient(135deg, #282a36 0%, #44475a 50%, #282a36 100%)',
  headerText: '#f8f8f2',
  headerSub: '#bd93f9',
  scenarioBg: 'rgba(68,71,90,0.6)',
  logBg: 'linear-gradient(135deg,#1e1f29,#282a36)',
  logBorder: '1px solid rgba(189,147,249,0.2)',
  scrollThumb: '#6272a4',
  cardStroke: '#44475a',
  laneHeaderBg: '#44475a',
  laneHeaderOpacity: 0.95,
  tooltipBg: '#44475a',
};

const LIGHT: ThemeColors = {
  bg: 'linear-gradient(160deg, #f0f4ff 0%, #e8eeff 30%, #fdf2f8 70%, #fef3c7 100%)',
  bgSecondary: '#f8fafc',
  bgCard: 'rgba(255,255,255,0.7)',
  bgCardHover: 'rgba(255,255,255,0.9)',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: 'rgba(199,210,254,0.4)',
  accent: '#6366f1',
  headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  headerText: '#ffffff',
  headerSub: 'rgba(255,255,255,0.8)',
  scenarioBg: 'rgba(255,255,255,0.6)',
  logBg: 'linear-gradient(135deg,#1e1b4b,#312e81)',
  logBorder: '1px solid rgba(99,102,241,0.2)',
  scrollThumb: '#c7d2fe',
  cardStroke: '#e2e8f0',
  laneHeaderBg: 'white',
  laneHeaderOpacity: 0.95,
  tooltipBg: 'white',
};

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
  t: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggle: () => {},
  t: DRACULA,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const toggle = useCallback(() => setIsDark(v => !v), []);
  const t = isDark ? DRACULA : LIGHT;
  return (
    <ThemeContext.Provider value={{ isDark, toggle, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

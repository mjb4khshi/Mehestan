import React, { createContext, useContext, useState, useEffect } from 'react';

export const MEHESTAN_THEMES = [
  {
    id: 'persian-dark',
    name: 'Persian Dark',
    persianName: 'ایرانی تاریک',
    mode: 'dark',
    primary: '#0077c2',
    base: '#000000',
    accent: '#fe28a2',
  },
  {
    id: 'persian-light',
    name: 'Persian Light',
    persianName: 'ایرانی روشن',
    mode: 'light',
    primary: '#0066a4',
    base: '#ffffff',
    accent: '#fe28a2',
  },
  {
    id: 'tehran',
    name: 'Tehran',
    persianName: 'تهران (گرم)',
    mode: 'light',
    primary: '#c1121f',
    base: '#fdf0d5',
    accent: '#003049',
  },
  {
    id: 'tehran-2',
    name: 'Tehran 2',
    persianName: 'سیاهکل',
    mode: 'dark',
    primary: '#dda15e',
    base: '#1b2610',
    accent: '#606c38',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    persianName: 'سایبرپانک نئون',
    mode: 'dark',
    primary: '#00f0ff',
    base: '#08090d',
    accent: '#ff007f',
  },
  {
    id: 'tokyo-midnight',
    name: 'Karaj Midnight',
    persianName: 'کرج نیمه‌شب',
    mode: 'dark',
    primary: '#8b5cf6',
    base: '#090a16',
    accent: '#06b6d4',
  },
  {
    id: 'ocean-abyss',
    name: 'Persian Gulf',
    persianName: 'خلیج فارس',
    mode: 'dark',
    primary: '#06b6d4',
    base: '#060d17',
    accent: '#38bdf8',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    persianName: 'زمرد کهنسال',
    mode: 'dark',
    primary: '#10b981',
    base: '#06130b',
    accent: '#34d399',
  },
  {
    id: 'crimson',
    name: 'Crimson Velvet',
    persianName: 'زرشکی و یاقوت',
    mode: 'dark',
    primary: '#f43f5e',
    base: '#110507',
    accent: '#fb7185',
  },
  {
    id: 'coffee-roast',
    name: 'Coffee Roast',
    persianName: 'اسپرسو و کهربا',
    mode: 'dark',
    primary: '#d97706',
    base: '#120d09',
    accent: '#f59e0b',
  },
  {
    id: 'sunset',
    name: 'Robat Karim Sunset',
    persianName: 'غروب رباط کریم',
    mode: 'light',
    primary: '#ff5e36',
    base: '#fffbf7',
    accent: '#e11d48',
  },
  {
    id: 'matcha',
    name: 'Matcha Blossom',
    persianName: 'چای ماچا',
    mode: 'light',
    primary: '#15803d',
    base: '#fbfdfa',
    accent: '#65a30d',
  },
  {
    id: 'nordic',
    name: 'Nordic Glacier',
    persianName: 'یخسار نوردیک',
    mode: 'light',
    primary: '#0284c7',
    base: '#f8fafc',
    accent: '#0ea5e9',
  },
  {
    id: 'batman',
    name: 'The Dark Knight',
    persianName: 'بتمن (شوالیه تاریکی)',
    mode: 'dark',
    primary: '#ffe600',
    base: '#000000',
    accent: '#ef4444',
  },
  {
    id: 'monochrome',
    name: 'Noir Monochrome',
    persianName: 'سیاه و سفید تاریک',
    mode: 'dark',
    primary: '#ffffff',
    base: '#000000',
    accent: '#71717a',
  },
  {
    id: 'monochrome-light',
    name: 'Paper Monochrome',
    persianName: 'سیاه و سفید روشن',
    mode: 'light',
    primary: '#000000',
    base: '#f8f8f8',
    accent: '#71717a',
  },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      // اشتراک تم با سروستان در صورت وجود
      const saved =
        localStorage.getItem('mehestan_theme') ||
        localStorage.getItem('sarvestan_theme');
      if (saved && MEHESTAN_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {}
    return 'persian-dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('datatheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const meta = MEHESTAN_THEMES.find((t) => t.id === theme) || MEHESTAN_THEMES[0];
    const mode = meta.mode || 'dark';
    document.documentElement.setAttribute('data-theme-mode', mode);

    try {
      localStorage.setItem('mehestan_theme', theme);
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', mode === 'dark' ? '#000000' : '#ffffff');
      }
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
  }, [theme]);

  // واکنش خودکار به تغییر حالت شب/روز سیستم عامل در صورت نبود تم اختصاصی
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      const saved = localStorage.getItem('mehestan_theme');
      if (!saved || saved === 'persian-light' || saved === 'persian-dark') {
        setTheme(e.matches ? 'persian-dark' : 'persian-light');
      }
    };
    try {
      media.addEventListener('change', handleSystemChange);
      return () => media.removeEventListener('change', handleSystemChange);
    } catch {
      media.addListener(handleSystemChange);
      return () => media.removeListener(handleSystemChange);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((t) => (t === 'persian-dark' ? 'persian-light' : 'persian-dark'));
  };

  const activeMeta = MEHESTAN_THEMES.find((t) => t.id === theme) || MEHESTAN_THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        themes: MEHESTAN_THEMES,
        activeThemeMeta: activeMeta,
        isDark: activeMeta.mode === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

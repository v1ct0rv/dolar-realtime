'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  function applyTheme(t: Theme) {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('dr-theme', t); } catch {}
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dr-theme') as Theme | null;
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      applyTheme(stored ?? sys); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      // localStorage unavailable (e.g. private mode)
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => applyTheme(theme === 'dark' ? 'light' : 'dark') }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

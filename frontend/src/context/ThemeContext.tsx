import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'theme-preference';

// Detect system preference for dark mode
const getSystemPreference = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Get the actual effective theme (resolving 'system' to light/dark)
const getEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemPreference() ? 'dark' : 'light';
  }
  return theme;
};

// Apply theme to DOM
const applyTheme = (theme: Theme) => {
  const effectiveTheme = getEffectiveTheme(theme);
  const htmlElement = document.documentElement;

  if (effectiveTheme === 'dark') {
    htmlElement.classList.add('dark');
  } else {
    htmlElement.classList.remove('dark');
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get saved preference from localStorage
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    return saved || 'system';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    getEffectiveTheme(theme) === 'dark'
  );

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme);
    setIsDarkMode(getEffectiveTheme(theme) === 'dark');
  }, [theme]);

  // Listen for system preference changes (when theme is set to 'system')
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setIsDarkMode(getSystemPreference());
      applyTheme('system');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Older browsers (deprecated but kept for compatibility)
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

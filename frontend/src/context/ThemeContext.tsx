import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
  if (typeof window === 'undefined') return false;
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
  if (typeof window === 'undefined' || !document) return;

  const effectiveTheme = getEffectiveTheme(theme);
  const htmlElement = document.documentElement;

  console.log('[ThemeContext] applyTheme called with:', { theme, effectiveTheme });

  // Add or remove the 'dark' class
  if (effectiveTheme === 'dark') {
    htmlElement.classList.add('dark');
    console.log('[ThemeContext] Added dark class');
  } else {
    htmlElement.classList.remove('dark');
    console.log('[ThemeContext] Removed dark class');
  }

  console.log('[ThemeContext] HTML classes now:', Array.from(htmlElement.classList));
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get saved preference from localStorage
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;

    // If no saved preference, use system preference if dark, otherwise default to 'system'
    let preferredTheme: Theme = 'system';
    if (saved) {
      preferredTheme = saved;
    } else if (getSystemPreference()) {
      // If system preference is dark and no saved preference, set to dark
      preferredTheme = 'dark';
      localStorage.setItem(THEME_KEY, 'dark');
    }

    console.log('[ThemeProvider] Initial theme:', preferredTheme, '(from localStorage or system preference)');
    return preferredTheme;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    let preferredTheme: Theme = 'system';
    if (saved) {
      preferredTheme = saved;
    } else if (getSystemPreference()) {
      preferredTheme = 'dark';
    }
    const isDark = getEffectiveTheme(preferredTheme) === 'dark';
    console.log('[ThemeProvider] Initial isDarkMode:', isDark);
    return isDark;
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    console.log('[ThemeProvider] Theme effect triggered with theme:', theme);
    applyTheme(theme);
    const newIsDark = getEffectiveTheme(theme) === 'dark';
    setIsDarkMode(newIsDark);
    console.log('[ThemeProvider] Set isDarkMode to:', newIsDark);
  }, [theme]);

  // Listen for system preference changes (when theme is set to 'system')
  useEffect(() => {
    if (theme !== 'system') {
      console.log('[ThemeProvider] Not listening for system changes, theme is:', theme);
      return;
    }

    console.log('[ThemeProvider] Setting up system preference listener');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      console.log('[ThemeProvider] System preference changed:', e.matches);
      setIsDarkMode(e.matches);
      applyTheme('system');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Older browsers (deprecated but kept for compatibility)
    else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleChange);
      return () => (mediaQuery as any).removeListener(handleChange);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    console.log('[ThemeProvider] setTheme called with:', newTheme);
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    console.log('[ThemeProvider] Saved theme to localStorage:', newTheme);
  }, []);

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

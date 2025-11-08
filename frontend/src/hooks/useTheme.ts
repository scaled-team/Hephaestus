import { useThemeContext } from '@/context/ThemeContext';

/**
 * Hook to access and manage theme settings
 * Must be used within a ThemeProvider
 *
 * @example
 * const { theme, isDarkMode, setTheme } = useTheme();
 * setTheme('dark');
 */
export const useTheme = () => {
  return useThemeContext();
};

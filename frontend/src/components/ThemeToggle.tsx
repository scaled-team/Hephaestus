import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    console.log('Setting theme to:', newTheme);
    setTheme(newTheme);
    console.log('Theme set, current document.documentElement.classList:', document.documentElement.classList.toString());
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {/* Light Mode Button */}
      <button
        onClick={() => handleThemeChange('light')}
        className={`flex items-center gap-2 px-3 py-2 rounded transition-colors cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Light mode"
        aria-label="Switch to light mode"
        type="button"
      >
        <Sun className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Light</span>
      </button>

      {/* Dark Mode Button */}
      <button
        onClick={() => handleThemeChange('dark')}
        className={`flex items-center gap-2 px-3 py-2 rounded transition-colors cursor-pointer ${
          theme === 'dark'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Dark mode"
        aria-label="Switch to dark mode"
        type="button"
      >
        <Moon className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Dark</span>
      </button>

      {/* System Preference Button */}
      <button
        onClick={() => handleThemeChange('system')}
        className={`flex items-center gap-2 px-3 py-2 rounded transition-colors cursor-pointer ${
          theme === 'system'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Follow system preference"
        aria-label="Follow system theme preference"
        type="button"
      >
        <Monitor className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">System</span>
      </button>
    </div>
  );
};

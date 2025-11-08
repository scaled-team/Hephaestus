import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {/* Light Mode Button */}
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
          theme === 'light'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Light mode"
        aria-label="Switch to light mode"
      >
        <Sun className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Light</span>
      </button>

      {/* Dark Mode Button */}
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
          theme === 'dark'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Dark mode"
        aria-label="Switch to dark mode"
      >
        <Moon className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Dark</span>
      </button>

      {/* System Preference Button */}
      <button
        onClick={() => setTheme('system')}
        className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
          theme === 'system'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Follow system preference"
        aria-label="Follow system theme preference"
      >
        <Monitor className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">System</span>
      </button>
    </div>
  );
};

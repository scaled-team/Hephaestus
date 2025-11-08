/**
 * Voice Settings Store
 * Manages user preferences for voice features across the application
 */

export interface VoiceSettings {
  // Text-to-Speech settings
  ttsEnabled: boolean;
  ttsRate: number; // 0.5 - 2.0
  ttsPitch: number; // 0 - 2
  ttsVolume: number; // 0 - 1
  ttsVoiceIndex: number;

  // Audio alerts settings
  alertsEnabled: boolean;
  alertVolume: number; // 0 - 1
  alertOnError: boolean;
  alertOnWarning: boolean;
  alertOnSuccess: boolean;

  // Voice commands settings
  voiceCommandsEnabled: boolean;
  voiceCommandLanguage: string;

  // Preferences
  autoReadErrors: boolean;
  autoReadNewLines: boolean;
  voiceFeedback: boolean; // Confirm commands with voice
}

const DEFAULT_SETTINGS: VoiceSettings = {
  ttsEnabled: true,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 0.8,
  ttsVoiceIndex: 0,
  alertsEnabled: true,
  alertVolume: 0.7,
  alertOnError: true,
  alertOnWarning: true,
  alertOnSuccess: true,
  voiceCommandsEnabled: true,
  voiceCommandLanguage: 'en-US',
  autoReadErrors: true,
  autoReadNewLines: false,
  voiceFeedback: true,
};

const STORAGE_KEY = 'voice_settings';

/**
 * Load voice settings from localStorage
 */
export const loadVoiceSettings = (): VoiceSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.error('Failed to load voice settings:', err);
  }
  return DEFAULT_SETTINGS;
};

/**
 * Save voice settings to localStorage
 */
export const saveVoiceSettings = (settings: VoiceSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save voice settings:', err);
  }
};

/**
 * Reset voice settings to defaults
 */
export const resetVoiceSettings = (): VoiceSettings => {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_SETTINGS;
};

/**
 * React Hook for voice settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VoiceStore {
  settings: VoiceSettings;
  updateSettings: (partial: Partial<VoiceSettings>) => void;
  resetSettings: () => void;
}

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      resetSettings: () =>
        set({
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'voice-settings',
      storage: {
        getItem: (key) => {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        },
        setItem: (key, value) => {
          localStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
        },
      },
    }
  )
);

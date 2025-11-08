import { useState, useCallback, useRef, useEffect } from 'react';

export type AlertLevel = 'error' | 'warning' | 'info' | 'success';

interface AlertSound {
  frequency: number; // Hz
  duration: number; // ms
  type: 'sine' | 'square' | 'triangle';
  volume: number; // 0-1
}

const ALERT_SOUNDS: Record<AlertLevel, AlertSound> = {
  error: { frequency: 800, duration: 500, type: 'sine', volume: 0.8 },
  warning: { frequency: 600, duration: 300, type: 'square', volume: 0.6 },
  info: { frequency: 400, duration: 200, type: 'sine', volume: 0.4 },
  success: { frequency: 700, duration: 400, type: 'triangle', volume: 0.7 },
};

export const useAudioAlerts = (enabled = true, masterVolume = 1.0) => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio context on first use
  const initAudioContext = useCallback(() => {
    if (audioContext) return audioContext;

    try {
      const ctx =
        new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create audio context';
      setError(message);
      console.error('Audio context error:', err);
      return null;
    }
  }, [audioContext]);

  const playSound = useCallback(
    (level: AlertLevel) => {
      if (!enabled) return;

      try {
        let ctx = audioContext;
        if (!ctx) {
          ctx = initAudioContext();
          if (!ctx) return;
        }

        const { frequency, duration, type, volume } = ALERT_SOUNDS[level];
        const now = ctx.currentTime;
        const finalVolume = Math.min(volume * masterVolume, 1);

        // Create oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type as OscillatorType;
        osc.frequency.value = frequency;

        // Connect and play
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Set volume envelope
        gain.gain.setValueAtTime(finalVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

        // Play sound
        osc.start(now);
        osc.stop(now + duration / 1000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to play sound';
        setError(message);
        console.error('Audio alert error:', err);
      }
    },
    [audioContext, enabled, masterVolume, initAudioContext]
  );

  const isSupported =
    typeof window !== 'undefined' &&
    (!!window.AudioContext || !!(window as any).webkitAudioContext);

  return {
    playSound,
    isSupported,
    error,
  };
};

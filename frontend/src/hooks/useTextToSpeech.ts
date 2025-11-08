import { useState, useCallback, useRef, useEffect } from 'react';

export interface TextToSpeechOptions {
  rate?: number; // 0.5 - 2.0, default 1.0
  pitch?: number; // 0 - 2, default 1
  volume?: number; // 0 - 1, default 1
  lang?: string; // default 'en-US'
  voiceIndex?: number; // index of available voice
}

export const useTextToSpeech = (options: TextToSpeechOptions = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    rate = 1.0,
    pitch = 1,
    volume = 1,
    lang = 'en-US',
    voiceIndex = 0,
  } = options;

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      try {
        // Stop any existing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = Math.min(Math.max(rate, 0.5), 2.0);
        utterance.pitch = Math.min(Math.max(pitch, 0), 2);
        utterance.volume = Math.min(Math.max(volume, 0), 1);
        utterance.lang = lang;

        // Set voice if available
        if (availableVoices.length > voiceIndex) {
          utterance.voice = availableVoices[voiceIndex];
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setError(null);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
        };

        utterance.onerror = (event) => {
          console.error('TTS Error:', event.error);
          setError(`Speech synthesis error: ${event.error}`);
          setIsSpeaking(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('TTS Error:', err);
      }
    },
    [rate, pitch, volume, lang, voiceIndex, availableVoices]
  );

  const pause = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  return {
    speak,
    stop,
    pause,
    isSpeaking,
    isPaused,
    isSupported,
    availableVoices,
    error,
  };
};

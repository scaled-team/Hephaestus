import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

const SpeechRecognition =
  typeof window !== 'undefined' &&
  ((window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition);

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
  } = options;

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech Recognition not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        finalTranscriptRef.current = '';
      };

      recognition.onresult = (event: any) => {
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcriptChunk + ' ';
          } else {
            interim += transcriptChunk;
          }
        }

        setInterimTranscript(interim);
        setTranscript(finalTranscriptRef.current.trim());
      };

      recognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`);
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start speech recognition';
      setError(message);
      console.error('Speech recognition error:', err);
    }
  }, [language, continuous, interimResults]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const isSupported = !!SpeechRecognition;

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  };
};

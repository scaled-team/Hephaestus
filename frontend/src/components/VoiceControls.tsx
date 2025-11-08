import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle,
  Settings,
  X,
  Check,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useAudioAlerts } from '@/hooks/useAudioAlerts';
import {
  parseVoiceCommand,
  getCommandDescription,
  getAvailableCommands,
} from '@/utils/voiceCommands';

interface VoiceControlsProps {
  onCommandExecuted?: (action: string, params: Record<string, any>) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  onCommandExecuted,
  onError,
  enabled = true,
}) => {
  const [voiceEnabled, setVoiceEnabled] = useState(enabled);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ continuous: false, interimResults: true });

  const { speak, isSpeaking } = useTextToSpeech({
    rate: 1.0,
    volume: 0.8,
  });

  const { playSound } = useAudioAlerts(true, 0.8);

  // Process transcript when final
  useEffect(() => {
    if (transcript && transcript.length > 0 && !isListening) {
      const command = parseVoiceCommand(transcript);
      const description = getCommandDescription(command);

      if (command.action !== 'unknown') {
        // Valid command recognized
        setLastCommand(description);
        setCommandStatus('success');
        playSound('success');

        if (ttsEnabled) {
          speak(description);
        }

        // Execute command
        onCommandExecuted?.(command.action, command.params);

        // Reset status after 3 seconds
        setTimeout(() => setCommandStatus('idle'), 3000);
      } else {
        // Command not recognized
        setLastCommand(`Sorry, I didn't understand: "${transcript}"`);
        setCommandStatus('error');
        playSound('warning');

        if (ttsEnabled) {
          speak(`Sorry, I didn't understand "${transcript}". Try saying help.`);
        }

        onError?.(transcript);

        // Reset status after 3 seconds
        setTimeout(() => setCommandStatus('idle'), 3000);
      }

      resetTranscript();
    }
  }, [transcript, isListening, onCommandExecuted, onError, ttsEnabled, speak, playSound, resetTranscript]);

  const handleStartListening = useCallback(() => {
    if (voiceEnabled) {
      resetTranscript();
      startListening();
    }
  }, [voiceEnabled, startListening, resetTranscript]);

  const handleStopListening = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleShowHelp = useCallback(() => {
    setShowHelp(!showHelp);
    if (!showHelp && ttsEnabled) {
      const commands = getAvailableCommands();
      const help = `Available voice commands: ${commands
        .slice(0, 5)
        .map((c) => c.pattern)
        .join(', ')}, and more. Say help for full list.`;
      speak(help);
    }
  }, [showHelp, ttsEnabled, speak]);

  if (!voiceEnabled) {
    return (
      <button
        onClick={() => setVoiceEnabled(true)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Enable voice controls"
      >
        <MicOff className="w-5 h-5 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Voice Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={
          isListening ? handleStopListening : handleStartListening
        }
        className={`p-2 rounded-lg transition-all ${
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse'
            : voiceEnabled
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-600'
        }`}
        title={isListening ? 'Stop listening (click to stop)' : 'Start listening (click to listen)'}
      >
        {isListening ? (
          <Mic className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5 opacity-50" />
        )}
      </motion.button>

      {/* TTS Toggle */}
      <button
        onClick={() => setTtsEnabled(!ttsEnabled)}
        className={`p-2 rounded-lg transition-colors ${
          ttsEnabled
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 text-gray-600'
        }`}
        title={ttsEnabled ? 'Disable voice feedback' : 'Enable voice feedback'}
      >
        {ttsEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>

      {/* Transcript Display */}
      <AnimatePresence>
        {(transcript || interimTranscript) && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-1 px-3 py-2 bg-white rounded-lg border-2 border-blue-300 min-w-0"
          >
            <p className="text-sm text-gray-700 truncate">
              {transcript || interimTranscript}
            </p>
            {isListening && (
              <div className="flex items-center space-x-1 text-xs text-blue-600 mt-1">
                <Loader className="w-3 h-3 animate-spin" />
                <span>Listening...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Status */}
      <AnimatePresence>
        {commandStatus !== 'idle' && lastCommand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs whitespace-nowrap ${
              commandStatus === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {commandStatus === 'success' ? (
              <Check className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            <span className="truncate">{lastCommand}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Button */}
      <button
        onClick={handleShowHelp}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Voice command help"
      >
        <HelpCircle className="w-4 h-4 text-gray-600" />
      </button>

      {/* Settings Button */}
      <button
        onClick={() => setVoiceEnabled(false)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Disable voice controls"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>

      {/* Help Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto"
          >
            {/* Help Header */}
            <div className="sticky top-0 bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Voice Commands</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="hover:bg-blue-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Commands List */}
            <div className="divide-y">
              {getAvailableCommands().map((cmd, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 hover:bg-gray-50 text-sm"
                >
                  <div className="font-mono text-blue-600 text-xs mb-1">
                    {cmd.pattern}
                  </div>
                  <div className="text-gray-600 text-xs">{cmd.description}</div>
                </div>
              ))}
            </div>

            {/* Help Footer */}
            <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-600">
              💡 Tip: Speak naturally, the system will understand variations
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {speechError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full right-0 mb-2 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs whitespace-nowrap"
          >
            {speechError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceControls;

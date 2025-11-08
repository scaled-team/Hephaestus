import React, { useState, useRef } from 'react';
import { Send, Volume2, VolumeX } from 'lucide-react';
import { useWebSocket } from '@/context/WebSocketContext';

interface AgentMessageInputProps {
  agentId: string;
  agentName?: string;
  audioEnabled?: boolean;
  onAudioToggle?: (enabled: boolean) => void;
}

const AgentMessageInput: React.FC<AgentMessageInputProps> = ({
  agentId,
  agentName,
  audioEnabled: propAudioEnabled = false,
  onAudioToggle,
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(propAudioEnabled);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isConnected } = useWebSocket();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !isConnected) {
      return;
    }

    setIsSending(true);
    try {
      // Send message via WebSocket
      sendMessage('agent_message', {
        agent_id: agentId,
        message: message.trim(),
      });

      // Clear input
      setMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 rounded-b-lg">
      <div className="flex items-center space-x-2">
        {/* Audio toggle */}
        <button
          type="button"
          onClick={() => {
            const newState = !audioEnabled;
            setAudioEnabled(newState);
            onAudioToggle?.(newState);
          }}
          className={`p-2 rounded-lg transition-colors ${
            audioEnabled
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={audioEnabled ? 'Audio enabled (click to disable)' : 'Audio disabled (click to enable)'}
        >
          {audioEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        {/* Message input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send a message to the agent..."
          disabled={!isConnected || isSending}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!isConnected || isSending || !message.trim()}
          className="p-2 rounded-lg bg-blue-600 dark:bg-blue-900/50 text-white dark:text-blue-300 hover:bg-blue-700 dark:hover:bg-blue-900/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Status indicator */}
      {!isConnected && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          Not connected to server
        </div>
      )}
    </form>
  );
};

export default AgentMessageInput;

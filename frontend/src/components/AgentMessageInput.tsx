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
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isConnected } = useWebSocket();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setSendError('Message cannot be empty');
      setSendStatus('error');
      return;
    }

    if (!isConnected) {
      setSendError('Not connected to server');
      setSendStatus('error');
      return;
    }

    setIsSending(true);
    setSendStatus('idle');
    setSendError(null);

    try {
      // Send message via WebSocket
      await sendMessage('agent_message', {
        agent_id: agentId,
        message: message.trim(),
      });

      // Clear input and show success
      setMessage('');
      setSendStatus('success');
      setSendError(null);
      inputRef.current?.focus();

      // Reset success status after 2 seconds
      setTimeout(() => setSendStatus('idle'), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      console.error('Failed to send message:', error);
      setSendStatus('error');
      setSendError(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to submit, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
    // Shift+Enter allows natural newline behavior
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
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to the agent... (Shift+Enter for new line)"
          disabled={!isConnected || isSending}
          rows={1}
          className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm transition-colors ${
            sendStatus === 'success'
              ? 'border-green-500 dark:border-green-400 focus:ring-green-500 dark:focus:ring-green-400'
              : sendStatus === 'error'
              ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400'
          }`}
          style={{ minHeight: '40px', maxHeight: '120px', overflow: 'auto' }}
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
      {sendStatus === 'success' && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center">
          <span className="inline-block w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full mr-1.5"></span>
          Message sent successfully
        </div>
      )}
      {sendStatus === 'error' && sendError && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center">
          <span className="inline-block w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mr-1.5"></span>
          {sendError}
        </div>
      )}
    </form>
  );
};

export default AgentMessageInput;

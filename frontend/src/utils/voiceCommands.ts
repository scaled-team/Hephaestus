/**
 * Voice Command Parser and Router
 * Converts spoken commands into actionable operations
 */

export interface ParsedCommand {
  action: string;
  params: Record<string, any>;
  confidence: number; // 0-1, how confident we are in the match
  originalText: string;
}

export type CommandAction =
  | 'pauseAll'
  | 'resumeAll'
  | 'pauseAgent'
  | 'resumeAgent'
  | 'selectAgent'
  | 'deselectAgent'
  | 'selectAll'
  | 'deselectAll'
  | 'toggleFullscreen'
  | 'exportOutput'
  | 'readError'
  | 'readOutput'
  | 'changeLayout'
  | 'toggleSidebar'
  | 'help'
  | 'unknown';

interface CommandPattern {
  pattern: RegExp;
  action: CommandAction;
  paramExtractor?: (match: RegExpMatchArray) => Record<string, any>;
  confidence?: number;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // Control all agents
  {
    pattern: /pause\s+all|pause\s+agents|stop\s+all|freeze\s+all/i,
    action: 'pauseAll',
    confidence: 0.95,
  },
  {
    pattern: /resume\s+all|resume\s+agents|start\s+all|play\s+all|unpause\s+all/i,
    action: 'resumeAll',
    confidence: 0.95,
  },
  {
    pattern: /select\s+all/i,
    action: 'selectAll',
    confidence: 0.9,
  },
  {
    pattern: /deselect\s+all|clear\s+all/i,
    action: 'deselectAll',
    confidence: 0.9,
  },

  // Control specific agent
  {
    pattern: /pause\s+agent\s+(\w+)|freeze\s+(\w+)/i,
    action: 'pauseAgent',
    paramExtractor: (match) => ({
      agentId: match[1] || match[2],
    }),
    confidence: 0.9,
  },
  {
    pattern: /resume\s+agent\s+(\w+)|play\s+(\w+)|start\s+(\w+)/i,
    action: 'resumeAgent',
    paramExtractor: (match) => ({
      agentId: match[1] || match[2] || match[3],
    }),
    confidence: 0.9,
  },
  {
    pattern: /show\s+agent\s+(\w+)|select\s+agent\s+(\w+)|view\s+(\w+)/i,
    action: 'selectAgent',
    paramExtractor: (match) => ({
      agentId: match[1] || match[2] || match[3],
    }),
    confidence: 0.9,
  },

  // Output reading
  {
    pattern: /read\s+last\s+error|read\s+error|what\s+error|error|speak\s+error/i,
    action: 'readError',
    confidence: 0.85,
  },
  {
    pattern: /read\s+output|read\s+latest|read\s+last|speak\s+output/i,
    action: 'readOutput',
    confidence: 0.8,
  },

  // UI Controls
  {
    pattern: /fullscreen|maximize|full\s+screen/i,
    action: 'toggleFullscreen',
    confidence: 0.9,
  },
  {
    pattern: /toggle\s+sidebar|hide\s+sidebar|show\s+sidebar/i,
    action: 'toggleSidebar',
    confidence: 0.85,
  },
  {
    pattern: /layout\s+(\d+x\d+)|show\s+(\d+x\d+)|change\s+to\s+(\d+x\d+)/i,
    action: 'changeLayout',
    paramExtractor: (match) => ({
      layout: match[1] || match[2] || match[3],
    }),
    confidence: 0.85,
  },

  // Export
  {
    pattern: /export|download|save\s+output|export\s+output/i,
    action: 'exportOutput',
    confidence: 0.9,
  },

  // Help
  {
    pattern: /help|what\s+commands|voice\s+commands|command\s+help/i,
    action: 'help',
    confidence: 0.9,
  },
];

/**
 * Parse voice transcript into actionable command
 */
export const parseVoiceCommand = (
  transcript: string
): ParsedCommand => {
  const trimmed = transcript.trim();

  for (const pattern of COMMAND_PATTERNS) {
    const match = trimmed.match(pattern.pattern);

    if (match) {
      return {
        action: pattern.action,
        params: pattern.paramExtractor?.(match) || {},
        confidence: pattern.confidence || 0.8,
        originalText: trimmed,
      };
    }
  }

  // No match found
  return {
    action: 'unknown',
    params: { transcript: trimmed },
    confidence: 0,
    originalText: trimmed,
  };
};

/**
 * Get human-readable description of a command
 */
export const getCommandDescription = (command: ParsedCommand): string => {
  switch (command.action) {
    case 'pauseAll':
      return 'Pausing all agents';
    case 'resumeAll':
      return 'Resuming all agents';
    case 'pauseAgent':
      return `Pausing agent ${command.params.agentId?.substring(0, 8)}`;
    case 'resumeAgent':
      return `Resuming agent ${command.params.agentId?.substring(0, 8)}`;
    case 'selectAgent':
      return `Showing agent ${command.params.agentId?.substring(0, 8)}`;
    case 'selectAll':
      return 'Selecting all agents';
    case 'deselectAll':
      return 'Deselecting all agents';
    case 'toggleFullscreen':
      return 'Toggling fullscreen';
    case 'exportOutput':
      return 'Exporting output';
    case 'readError':
      return 'Reading last error';
    case 'readOutput':
      return 'Reading output';
    case 'toggleSidebar':
      return 'Toggling sidebar';
    case 'changeLayout':
      return `Changing layout to ${command.params.layout}`;
    case 'help':
      return 'Showing voice command help';
    case 'unknown':
      return `Command not recognized: "${command.originalText}"`;
    default:
      return 'Unknown command';
  }
};

/**
 * Get list of available voice commands for help
 */
export const getAvailableCommands = (): Array<{
  pattern: string;
  description: string;
}> => [
  {
    pattern: '"Pause all agents"',
    description: 'Pause all agents at once',
  },
  {
    pattern: '"Resume all agents"',
    description: 'Resume all agents at once',
  },
  {
    pattern: '"Select agent [ID]"',
    description: 'Show a specific agent',
  },
  {
    pattern: '"Pause agent [ID]"',
    description: 'Pause a specific agent',
  },
  {
    pattern: '"Resume agent [ID]"',
    description: 'Resume a specific agent',
  },
  {
    pattern: '"Read error"',
    description: 'Read the last error message aloud',
  },
  {
    pattern: '"Read output"',
    description: 'Read recent output aloud',
  },
  {
    pattern: '"Fullscreen"',
    description: 'Toggle fullscreen mode',
  },
  {
    pattern: '"Toggle sidebar"',
    description: 'Show or hide the sidebar',
  },
  {
    pattern: '"Export output"',
    description: 'Export the current output',
  },
  {
    pattern: '"Select all"',
    description: 'Select all agents',
  },
  {
    pattern: '"Deselect all"',
    description: 'Deselect all agents',
  },
  {
    pattern: '"Help"',
    description: 'Show available voice commands',
  },
];

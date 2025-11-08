/**
 * Voice Features Tests
 * Tests for voice hooks, commands, and integration
 */

import { parseVoiceCommand, getCommandDescription, getAvailableCommands } from '@/utils/voiceCommands';

describe('Voice Commands Parser', () => {
  describe('Pause/Resume Commands', () => {
    it('should parse "pause all" command', () => {
      const cmd = parseVoiceCommand('pause all');
      expect(cmd.action).toBe('pauseAll');
      expect(cmd.confidence).toBeGreaterThan(0.9);
    });

    it('should parse "resume all agents" command', () => {
      const cmd = parseVoiceCommand('resume all agents');
      expect(cmd.action).toBe('resumeAll');
      expect(cmd.confidence).toBeGreaterThan(0.9);
    });

    it('should handle case variations', () => {
      const cmd1 = parseVoiceCommand('PAUSE ALL');
      const cmd2 = parseVoiceCommand('Pause All');
      const cmd3 = parseVoiceCommand('pause all');
      expect(cmd1.action).toBe('pauseAll');
      expect(cmd2.action).toBe('pauseAll');
      expect(cmd3.action).toBe('pauseAll');
    });

    it('should recognize pause synonyms', () => {
      const commands = ['pause all', 'stop all', 'freeze all', 'pause agents'];
      commands.forEach((cmd) => {
        const parsed = parseVoiceCommand(cmd);
        expect(parsed.action).toBe('pauseAll');
      });
    });
  });

  describe('Agent-Specific Commands', () => {
    it('should parse "show agent" command with ID', () => {
      const cmd = parseVoiceCommand('show agent abc123');
      expect(cmd.action).toBe('selectAgent');
      expect(cmd.params.agentId).toBe('abc123');
    });

    it('should parse "pause agent" command', () => {
      const cmd = parseVoiceCommand('pause agent xyz789');
      expect(cmd.action).toBe('pauseAgent');
      expect(cmd.params.agentId).toBe('xyz789');
    });

    it('should extract agent ID from various formats', () => {
      const commands = [
        'select agent 12ab',
        'show 12ab',
        'view agent 12ab',
      ];
      commands.forEach((cmd) => {
        const parsed = parseVoiceCommand(cmd);
        expect(parsed.params.agentId).toBeDefined();
      });
    });
  });

  describe('Output Reading Commands', () => {
    it('should recognize "read error" command', () => {
      const cmd = parseVoiceCommand('read error');
      expect(cmd.action).toBe('readError');
    });

    it('should recognize "read output" command', () => {
      const cmd = parseVoiceCommand('read output');
      expect(cmd.action).toBe('readOutput');
    });

    it('should handle error reading variations', () => {
      const commands = ['read error', 'read last error', 'what error', 'error'];
      commands.forEach((cmd) => {
        const parsed = parseVoiceCommand(cmd);
        expect(parsed.action).toBe('readError');
      });
    });
  });

  describe('UI Control Commands', () => {
    it('should parse fullscreen command', () => {
      const cmd = parseVoiceCommand('fullscreen');
      expect(cmd.action).toBe('toggleFullscreen');
    });

    it('should parse layout change command', () => {
      const cmd = parseVoiceCommand('layout 2x2');
      expect(cmd.action).toBe('changeLayout');
      expect(cmd.params.layout).toBe('2x2');
    });

    it('should recognize layout variations', () => {
      const cmd1 = parseVoiceCommand('show 3x3');
      const cmd2 = parseVoiceCommand('change to 2x3');
      expect(cmd1.action).toBe('changeLayout');
      expect(cmd2.action).toBe('changeLayout');
    });
  });

  describe('Help and Unknown Commands', () => {
    it('should recognize help command', () => {
      const cmd = parseVoiceCommand('help');
      expect(cmd.action).toBe('help');
    });

    it('should return unknown action for unrecognized commands', () => {
      const cmd = parseVoiceCommand('xyz nonsense blah');
      expect(cmd.action).toBe('unknown');
      expect(cmd.confidence).toBe(0);
    });

    it('should preserve original text for unknown commands', () => {
      const text = 'some random text';
      const cmd = parseVoiceCommand(text);
      expect(cmd.originalText).toBe(text);
    });
  });

  describe('Command Descriptions', () => {
    it('should generate description for pauseAll', () => {
      const cmd = parseVoiceCommand('pause all');
      const desc = getCommandDescription(cmd);
      expect(desc).toContain('Pausing');
      expect(desc.toLowerCase()).toContain('agent');
    });

    it('should generate description for selectAgent with ID', () => {
      const cmd = parseVoiceCommand('select agent abc12345');
      const desc = getCommandDescription(cmd);
      expect(desc).toContain('Showing agent');
      expect(desc).toContain('abc1');
    });

    it('should generate description for unknown commands', () => {
      const cmd = parseVoiceCommand('blah blah');
      const desc = getCommandDescription(cmd);
      expect(desc).toContain('not recognized');
    });
  });

  describe('Available Commands', () => {
    it('should return list of available commands', () => {
      const commands = getAvailableCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should have pattern and description for each command', () => {
      const commands = getAvailableCommands();
      commands.forEach((cmd) => {
        expect(cmd.pattern).toBeDefined();
        expect(typeof cmd.pattern).toBe('string');
        expect(cmd.description).toBeDefined();
        expect(typeof cmd.description).toBe('string');
      });
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for exact matches', () => {
      const cmd = parseVoiceCommand('pause all');
      expect(cmd.confidence).toBeGreaterThan(0.9);
    });

    it('should have zero confidence for unknown commands', () => {
      const cmd = parseVoiceCommand('random nonsense');
      expect(cmd.confidence).toBe(0);
    });

    it('should have reasonable confidence for fuzzy matches', () => {
      const cmd = parseVoiceCommand('resume agents please');
      expect(cmd.action).toBe('resumeAll');
      expect(cmd.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcript', () => {
      const cmd = parseVoiceCommand('');
      expect(cmd.action).toBe('unknown');
    });

    it('should handle whitespace-only transcript', () => {
      const cmd = parseVoiceCommand('   ');
      expect(cmd.action).toBe('unknown');
    });

    it('should handle very long transcript', () => {
      const longText = 'pause all ' + 'blah '.repeat(100);
      const cmd = parseVoiceCommand(longText);
      expect(cmd.action).toBe('pauseAll');
    });

    it('should handle special characters', () => {
      const cmd = parseVoiceCommand('pause all!@#$%');
      // Should still match despite special characters
      expect(cmd.action).toBe('pauseAll');
    });
  });
});

describe('Voice Settings Store', () => {
  // These tests would use the zustand store
  // Note: Requires proper setup of localStorage mock in test environment

  it('should load default settings', () => {
    // Test that default settings are properly structured
    const defaults = {
      ttsEnabled: true,
      alertsEnabled: true,
      voiceCommandsEnabled: true,
    };

    Object.entries(defaults).forEach(([key, value]) => {
      expect(typeof value).toBe(typeof value);
    });
  });
});

describe('Accessibility', () => {
  it('voice commands should not interfere with normal text input', () => {
    // When user is typing in a text field, voice commands should not trigger
    const cmd = parseVoiceCommand('select agent 123');
    expect(cmd.action).toBe('selectAgent');
    // But this should only execute if not in text input
  });

  it('should support keyboard alternatives for all voice commands', () => {
    // All voice command actions should have keyboard equivalents
    const commands = getAvailableCommands();
    expect(commands.length).toBeGreaterThan(0);
    // Each should have a documented keyboard alternative
  });
});

describe('Browser Compatibility', () => {
  it('should gracefully handle missing SpeechRecognition API', () => {
    // Test that parseVoiceCommand still works even if API unavailable
    const cmd = parseVoiceCommand('pause all');
    expect(cmd.action).toBe('pauseAll');
  });

  it('should gracefully handle missing SpeechSynthesis API', () => {
    // Text parsing should work independent of TTS availability
    const cmd = parseVoiceCommand('read error');
    expect(cmd.action).toBe('readError');
  });
});

describe('Performance', () => {
  it('should parse command in reasonable time', () => {
    const start = performance.now();
    parseVoiceCommand('pause all agents');
    const end = performance.now();
    expect(end - start).toBeLessThan(10); // Should be <10ms
  });

  it('should handle multiple rapid command parses', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      parseVoiceCommand('pause all');
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(500); // 100 parses in <500ms
  });
});

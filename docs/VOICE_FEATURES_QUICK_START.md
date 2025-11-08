# Voice Features Quick Start Guide

## Overview
The Observability dashboard now includes full voice integration - monitor agents through speech, control with voice commands, and receive audio alerts.

---

## 🚀 Getting Started

### Files Added
```
Hooks:
- src/hooks/useTextToSpeech.ts      (Text-to-Speech engine)
- src/hooks/useAudioAlerts.ts       (Audio alert system)
- src/hooks/useSpeechRecognition.ts (Voice command recognition)

Components:
- src/components/VoiceControls.tsx  (Voice UI controls)

Utilities:
- src/utils/voiceCommands.ts        (Command parser & router)

Store:
- src/store/voiceStore.ts           (Settings persistence)

Tests:
- src/__tests__/voice.test.ts       (Comprehensive tests)
```

### Integration Points
```
Modified:
- src/components/ObservabilityPanel.tsx (Added voice alerts & controls)
```

---

## 📖 Features

### 1. **Text-to-Speech (Narration)** 🔊
Read agent output aloud while monitoring.

**How to Use:**
1. Click the **📢 Voice** button in the panel header
2. Say any voice command or click "?" for help
3. Output will be read automatically on errors

**Capabilities:**
- Adjustable speech speed (0.5x - 2.0x)
- Multiple voice options
- Volume control
- Pause/Resume functionality

**Code Example:**
```typescript
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

const { speak, stop, isSpeaking } = useTextToSpeech({
  rate: 1.0,
  pitch: 1,
  volume: 0.8,
});

// Speak text
speak('Agent task completed successfully');
```

---

### 2. **Voice Commands** 🎤
Control the dashboard entirely through voice commands.

**How to Use:**
1. Click the **microphone icon** to start listening
2. Say a command naturally
3. The system will execute it and confirm with voice feedback

**Available Commands:**

**Agent Control:**
- "Pause all agents"
- "Resume all agents"
- "Select agent [ID]"
- "Pause agent [ID]"
- "Resume agent [ID]"

**Output Reading:**
- "Read error" / "Read last error"
- "Read output" / "Read latest"

**UI Controls:**
- "Fullscreen" / "Maximize"
- "Toggle sidebar"
- "Layout 2x2" / "Show 3x3"
- "Export output" / "Download"

**Other:**
- "Select all" / "Deselect all"
- "Help" / "Voice commands"

**Code Example:**
```typescript
import { parseVoiceCommand } from '@/utils/voiceCommands';

const command = parseVoiceCommand('pause all agents');
console.log(command);
// {
//   action: 'pauseAll',
//   params: {},
//   confidence: 0.95,
//   originalText: 'pause all agents'
// }
```

---

### 3. **Audio Alerts** 🔔
Get instant audio notifications for important events.

**Triggered On:**
- ❌ **ERROR**: High-frequency beep (800Hz)
- ⚠️ **WARNING**: Mid-frequency tone (600Hz)
- ✅ **SUCCESS**: Pleasant chime (700Hz)
- ℹ️ **INFO**: Soft tone (400Hz)

**How to Use:**
- Alerts play automatically when detected in output
- Toggle alerts on/off in voice controls
- Customize volumes in settings

**Code Example:**
```typescript
import { useAudioAlerts } from '@/hooks/useAudioAlerts';

const { playSound } = useAudioAlerts(true, 0.8);

// Play error alert
playSound('error');

// Play success alert
playSound('success');
```

---

## 🎛️ Configuration

### Voice Settings Store
All voice preferences are automatically saved to localStorage.

```typescript
import { useVoiceStore } from '@/store/voiceStore';

const { settings, updateSettings } = useVoiceStore();

// Update settings
updateSettings({
  ttsEnabled: true,
  ttsRate: 1.2,
  alertsEnabled: true,
  voiceCommandsEnabled: true,
});
```

**Available Settings:**
```typescript
{
  // Text-to-Speech
  ttsEnabled: boolean,
  ttsRate: number,              // 0.5 - 2.0
  ttsPitch: number,             // 0 - 2
  ttsVolume: number,            // 0 - 1
  ttsVoiceIndex: number,        // Available voice index

  // Audio Alerts
  alertsEnabled: boolean,
  alertVolume: number,          // 0 - 1
  alertOnError: boolean,
  alertOnWarning: boolean,
  alertOnSuccess: boolean,

  // Voice Commands
  voiceCommandsEnabled: boolean,
  voiceCommandLanguage: string, // 'en-US', etc.

  // Preferences
  autoReadErrors: boolean,
  autoReadNewLines: boolean,
  voiceFeedback: boolean,       // Confirm commands
}
```

---

## 💡 Usage Examples

### Example 1: Monitor Agent with Voice
```typescript
// In ObservabilityPanel component
const { speak } = useTextToSpeech({ rate: 1.0 });
const { playSound } = useAudioAlerts();

// Auto-read errors
useEffect(() => {
  if (output.includes('ERROR')) {
    playSound('error');
    speak('Error detected in agent output');
  }
}, [output]);
```

### Example 2: Handle Voice Commands
```typescript
<VoiceControls
  onCommandExecuted={(action, params) => {
    switch (action) {
      case 'pauseAll':
        pauseAllAgents();
        break;
      case 'selectAgent':
        selectAgent(params.agentId);
        break;
      case 'readError':
        const error = getLastError();
        speak(error);
        break;
    }
  }}
  onError={(error) => {
    console.error('Voice command failed:', error);
  }}
/>
```

### Example 3: Custom Voice Feedback
```typescript
const { speak } = useTextToSpeech();

// Confirm actions with voice
const handleExport = async () => {
  try {
    await exportOutput();
    speak('Output exported successfully');
  } catch (err) {
    speak('Failed to export output');
  }
};
```

---

## 🧪 Testing Voice Features

### Run Tests
```bash
npm test -- voice.test.ts
```

### Test Voice Parser Directly
```typescript
import { parseVoiceCommand } from '@/utils/voiceCommands';

// Test command parsing
const cmd1 = parseVoiceCommand('pause all');
console.assert(cmd1.action === 'pauseAll');

const cmd2 = parseVoiceCommand('select agent abc123');
console.assert(cmd2.action === 'selectAgent');
console.assert(cmd2.params.agentId === 'abc123');
```

### Manual Testing Checklist
- [ ] Microphone button starts/stops listening
- [ ] Transcript appears while speaking
- [ ] Commands execute correctly
- [ ] Voice feedback works
- [ ] Audio alerts play on errors
- [ ] TTS reads output correctly
- [ ] Settings persist across reloads
- [ ] Works in fullscreen mode
- [ ] Browser compatibility tested

---

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Text-to-Speech | ✅ | ⚠️ Partial | ✅ | ✅ |
| Speech Recognition | ✅ | ❌ | ⚠️ iOS | ✅ |
| Web Audio (Alerts) | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |

**Fallback Behavior:**
- If SpeechRecognition unavailable → Show disabled message
- If SpeechSynthesis unavailable → Show disabled message
- If Web Audio unavailable → Skip audio alerts (graceful)

---

## ⚙️ Advanced Configuration

### Custom Voice Selection
```typescript
const { speak, availableVoices } = useTextToSpeech();

// List available voices
console.log(availableVoices);
// Returns: SpeechSynthesisVoice[]

// Use specific voice
const { speak } = useTextToSpeech({ voiceIndex: 2 });
```

### Custom Alert Sounds
You can customize alert frequencies in `useAudioAlerts`:
```typescript
const CUSTOM_SOUNDS = {
  error: { frequency: 1000, duration: 600, type: 'sine', volume: 0.9 },
  warning: { frequency: 700, duration: 400, type: 'square', volume: 0.7 },
};
```

### Language Support
```typescript
const { startListening } = useSpeechRecognition({
  language: 'es-ES', // Spanish
});

const { speak } = useTextToSpeech({
  lang: 'es-ES',
});
```

---

## 🐛 Troubleshooting

### Microphone Not Working
1. Check browser permissions
2. Test with: "chrome://settings/content/microphone"
3. Verify SpeechRecognition API available
4. Try different browser

### Speech Recognition Not Recognizing Commands
1. Speak clearly and naturally
2. Say commands in English (or set language)
3. Check microphone input level
4. Reload page and retry
5. Try simpler command variations

### Audio Alerts Not Playing
1. Check system volume
2. Verify Web Audio API works
3. Check browser console for errors
4. Try different browser
5. Disable other audio apps

### Settings Not Persisting
1. Check localStorage is enabled
2. Clear browser cache
3. Check storage quota
4. Try incognito mode (temporary)

### TTS Voice Options Limited
- Different browsers have different voices
- Install additional system voices if needed
- Voice availability varies by OS

---

## 📱 Mobile & Accessibility

### Mobile Support
- Touch-friendly voice controls
- Works with mobile microphones
- Optimized for portrait/landscape
- Fallback for limited devices

### Accessibility Features
- ARIA labels on all controls
- Keyboard navigation support
- High contrast mode
- Screen reader compatible
- No audio-only feedback (always paired with visual)
- Captions for audio alerts
- Adjustable speech rate/pitch

### Keyboard Shortcuts
```
? - Show help
Esc - Stop listening/close panel
Enter - Send command
Space - Start/stop listening (in focus)
Ctrl+A - Select all agents
```

---

## 🚀 Performance Tips

### Optimize for Slow Networks
```typescript
// Reduce update frequency
const { startListening } = useSpeechRecognition({
  continuous: false, // Single command at a time
});
```

### Reduce CPU Usage
```typescript
// Disable animations during playback
if (isSpeaking) {
  disableAnimations();
}
```

### Memory Management
```typescript
// Stop playback when unmounting
useEffect(() => {
  return () => {
    stop();
  };
}, []);
```

---

## 📚 API Reference

### useTextToSpeech Hook
```typescript
interface UseTextToSpeech {
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  availableVoices: SpeechSynthesisVoice[];
  isSupported: boolean;
  error: string | null;
}
```

### useAudioAlerts Hook
```typescript
interface UseAudioAlerts {
  playSound: (level: 'error' | 'warning' | 'info' | 'success') => void;
  isSupported: boolean;
  error: string | null;
}
```

### useSpeechRecognition Hook
```typescript
interface UseSpeechRecognition {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}
```

### parseVoiceCommand Function
```typescript
function parseVoiceCommand(transcript: string): {
  action: CommandAction;
  params: Record<string, any>;
  confidence: number; // 0-1
  originalText: string;
}
```

---

## 🎓 Learning Resources

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

---

## 📝 Version History

### v1.0.0 (Initial Release)
- ✅ Text-to-Speech engine
- ✅ Audio alerts system
- ✅ Voice command recognition
- ✅ 13+ voice commands
- ✅ Settings persistence
- ✅ Full browser compatibility
- ✅ Accessibility support

---

## 🤝 Contributing

### Adding New Voice Commands
1. Add pattern to `COMMAND_PATTERNS` in `voiceCommands.ts`
2. Handle action in `VoiceControls` or calling component
3. Add tests for new command
4. Update documentation

### Example: Adding New Command
```typescript
// In voiceCommands.ts
{
  pattern: /my new command|alternative phrase/i,
  action: 'myNewAction',
  confidence: 0.9,
}

// In component
onCommandExecuted={(action) => {
  if (action === 'myNewAction') {
    // Handle new command
  }
}}
```

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review troubleshooting section
3. Test in different browser
4. Check GitHub issues
5. Create detailed bug report

---

## ✨ Future Enhancements

Planned features:
- [ ] Multi-language support (FR, ES, DE, etc.)
- [ ] Custom voice profiles
- [ ] Voice biometrics
- [ ] Emotional AI analysis
- [ ] Spatial audio
- [ ] Voice note annotations
- [ ] AI-powered command suggestions

---

**Enjoy hands-free agent monitoring!** 🎉

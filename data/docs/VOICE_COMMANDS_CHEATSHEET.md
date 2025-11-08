# Voice Commands Cheatsheet 🎤

## Quick Reference for All Voice Commands

---

## 🎯 Control All Agents

### Pause All
```
"Pause all"
"Pause all agents"
"Stop all"
"Freeze all"
```
→ **Action**: Pauses updates from all agents

### Resume All
```
"Resume all"
"Resume all agents"
"Play all"
"Start all"
"Unpause all"
```
→ **Action**: Resumes updates from all agents

### Select All
```
"Select all"
"Choose all"
"Pick all"
```
→ **Action**: Makes all agents visible

### Deselect All
```
"Deselect all"
"Clear all"
"Remove all"
```
→ **Action**: Hides all agents

---

## 🤖 Control Specific Agent

### Show Agent
```
"Show agent [ID]"
"Select agent [ID]"
"View [ID]"
"Show [ID]"
```
→ **Action**: Select and display specific agent
→ **Example**: "Show agent abc123"

### Pause Agent
```
"Pause agent [ID]"
"Freeze [ID]"
"Stop agent [ID]"
```
→ **Action**: Pause updates from specific agent
→ **Example**: "Pause agent xyz789"

### Resume Agent
```
"Resume agent [ID]"
"Play agent [ID]"
"Start agent [ID]"
```
→ **Action**: Resume updates from specific agent
→ **Example**: "Resume agent abc123"

---

## 📖 Read Output

### Read Last Error
```
"Read error"
"Read last error"
"What error"
"Error"
"Speak error"
```
→ **Action**: Reads the last error message aloud
→ **Use Case**: Get error details without looking

### Read Output
```
"Read output"
"Read latest"
"Read last"
"Speak output"
```
→ **Action**: Reads recent output lines aloud
→ **Use Case**: Monitor while doing other things

---

## 🖥️ UI Controls

### Fullscreen
```
"Fullscreen"
"Maximize"
"Full screen"
"Go fullscreen"
```
→ **Action**: Toggle fullscreen mode
→ **Use Case**: Focus on single agent

### Toggle Sidebar
```
"Toggle sidebar"
"Hide sidebar"
"Show sidebar"
"Sidebar"
```
→ **Action**: Show/hide agent list sidebar
→ **Use Case**: More screen space

### Change Layout
```
"Layout 1x1"
"Show 2x2"
"Change to 3x3"
"Layout 2x3"
```
→ **Action**: Change grid layout
→ **Options**: 1x1, 2x2, 3x3, 2x3, custom
→ **Example**: "Layout 3x3" shows 9 agents

---

## 📥 Export & Save

### Export Output
```
"Export"
"Download"
"Save output"
"Export output"
"Download output"
```
→ **Action**: Export current agent output
→ **Format**: Text file (downloadable)

---

## ❓ Help & Info

### Show Help
```
"Help"
"Help me"
"What commands"
"Voice commands"
"Command help"
"Show help"
```
→ **Action**: Display available voice commands
→ **UI**: Opens help panel with all commands

---

## 🎙️ Command Tips

### Pronunciation Tips
- **Speak clearly** but naturally
- **Pause between words** (system adds spaces)
- **Don't rush** - give system time to process
- **Say "agent" before ID** when needed

### Natural Language
These work too:
```
"Can you pause all"
"Could you show agent abc"
"Please resume all agents"
"Show me agent xyz"
```

### Acronyms & Abbreviations
```
✅ "Show agent abc" → Works
✅ "Agent abc" → Works (if clear context)
❌ "abc" → May not work (too short)
```

### Numbers & IDs
```
✅ "Agent 1 2 A B" → Works (system spells it out)
✅ "Select agent 12ab" → Works
❌ "Show agent twelve" → Use numbers, not words
```

---

## 📊 Command Categories

### By Frequency (Most Used First)

| Rank | Command | Category |
|------|---------|----------|
| 1 | "Pause all" | Control |
| 2 | "Resume all" | Control |
| 3 | "Read error" | Output |
| 4 | "Show agent [ID]" | Control |
| 5 | "Help" | Info |
| 6 | "Fullscreen" | UI |
| 7 | "Read output" | Output |
| 8 | "Toggle sidebar" | UI |
| 9 | "Layout 2x2" | UI |
| 10 | "Select all" | Control |

---

## 🎯 Common Workflows

### Workflow 1: Focus on Single Agent
```
1. Say: "Show agent abc123"
   → Agent selected and displayed

2. Say: "Fullscreen"
   → Full-screen view of agent

3. Say: "Read output"
   → Latest output read aloud

4. Say: "Read error"
   → If error, reads it
```

### Workflow 2: Bulk Agent Management
```
1. Say: "Select all"
   → All agents visible

2. Say: "Layout 3x3"
   → Show 9 agents at once

3. Say: "Pause all"
   → Stop all updates

4. Say: "Read output"
   → Hear latest from all agents
```

### Workflow 3: Troubleshooting
```
1. Say: "Help"
   → See available commands

2. Say: "Read error"
   → Hear what's wrong

3. Say: "Show agent [failing-id]"
   → Focus on problem agent

4. Say: "Read output"
   → Get more context
```

### Workflow 4: Monitoring While Away
```
1. Say: "Pause all"
   → Freeze current state

2. [Do other work...]

3. Say: "Resume all"
   → Continue monitoring

4. Say: "Read error"
   → Check for problems
```

---

## 🔊 Audio Feedback

### Success
```
✅ Command confirmed with cheerful tone
✅ System says: "Pausing all agents"
✅ Action executes
```

### Not Recognized
```
⚠️ Warning tone plays
⚠️ System says: "Sorry, didn't understand..."
⚠️ Suggest saying "Help"
```

### Error Alert
```
🔔 Error sound plays
🔔 Matches last error in output
🔔 Optional text-to-speech of error
```

---

## ⌨️ Keyboard Alternatives

**If voice not available:**

| Voice Command | Keyboard |
|---------------|----------|
| "Pause all" | `P` |
| "Resume all" | `R` |
| "Show agent X" | Click agent in list |
| "Fullscreen" | `F` or `ESC` |
| "Read error" | `Ctrl+E` |
| "Help" | `?` or `H` |
| "Toggle sidebar" | `T` |

---

## 🌐 Language Support

### Current
- ✅ **English (US)** - Full support
- ⚠️ **English (other regions)** - May need adjustment

### Future
- 🔜 Spanish (ES, MX)
- 🔜 French (FR)
- 🔜 German (DE)
- 🔜 Japanese (JA)
- 🔜 Mandarin (ZH)

### Custom Language
```javascript
// In code
const { startListening } = useSpeechRecognition({
  language: 'es-ES' // Spanish
});
```

---

## 🎤 Microphone Setup

### Check Microphone Works
1. Click voice button (microphone icon)
2. You should see **"Listening..."**
3. Say something simple: "Hello"
4. You should see transcript appear

### If Not Working
```
Browser Check:
1. Settings → Privacy → Microphone
2. Allow microphone for this site
3. Reload page
4. Try again

System Check:
1. Mic connected?
2. Mic enabled in OS?
3. Volume turned up?
4. Other apps using mic? (close them)
```

---

## 📱 Mobile Commands

### Mobile Best Practices
```
✅ Hold phone naturally
✅ Speak near microphone
✅ Use speaker or headset for TTS
✅ Good lighting for visual feedback
```

### Mobile Limitations
```
⚠️ Some Android: Limited voice support
⚠️ iOS: Requires HTTPS (should work)
⚠️ Slow networks: May delay recognition
✅ Modern phones work great
```

---

## 🎯 Advanced Tips

### Compound Commands
```
NOT SUPPORTED:
❌ "Pause all and show agent abc"

Instead use:
✅ "Pause all"
✅ (wait for confirmation)
✅ "Show agent abc"
```

### Command Chaining
Works great:
```
1. "Pause all"
2. "Layout 3x3"
3. "Read output"
(Each command executes independently)
```

### Rapid Commands
```
✅ Can issue commands rapidly
✅ System queues them
✅ Executes in order
✅ Waits for TTS feedback
```

---

## 🆘 If Something Goes Wrong

### No Response
```
1. Check microphone icon
2. Is it blue/red (listening)?
3. Say "Help"
4. Should hear: "Available commands..."
```

### Wrong Command Executed
```
1. Say "Help"
2. Find correct command
3. Try with different words
4. Speak more clearly
```

### Can't Find Agent ID
```
1. Say "Help"
2. Click on agent in list
3. Copy the ID
4. Say "Show agent [ID]"
```

### Microphone Not Working
```
1. Check browser permissions
2. Allow microphone access
3. Reload dashboard
4. Click voice button
5. Retry command
```

---

## 📚 Quick Reference Table

| Need | Voice Command | Result |
|------|---------------|--------|
| Pause everything | "Pause all" | All agents pause |
| Resume everything | "Resume all" | All agents resume |
| Focus on agent | "Show agent abc" | Agent abc displayed |
| Hear errors | "Read error" | Error read aloud |
| Hear latest | "Read output" | Latest output read |
| Bigger view | "Fullscreen" | Fullscreen agent |
| See all agents | "Layout 3x3" | 9 agents visible |
| Hide sidebar | "Toggle sidebar" | More screen space |
| Get help | "Help" | Commands listed |
| Export data | "Export" | Download output |

---

## 🎓 Getting Started

**First Time?**
1. Click **microphone icon** (🎤)
2. System says **"Listening..."**
3. Say **"Help"**
4. See all available commands
5. Try **"Pause all"**
6. Try **"Show agent [ID]"** (from list)

**Want Advanced Use?**
1. Explore command workflows
2. Try compound operations
3. Use with keyboard shortcuts
4. Customize voice settings

---

## 📞 Quick Help

**Say these for instant help:**

```
"Help"              → Show all commands
"What commands"     → Same as above
"Voice commands"    → Same as above
"How to..."         → Open help panel
```

---

## 🔗 Related Resources

- Full Guide: `VOICE_FEATURES_QUICK_START.md`
- Technical Docs: `VOICE_IMPLEMENTATION_GUIDE.md`
- Implementation: `VOICE_IMPLEMENTATION_SUMMARY.md`
- Code: `src/utils/voiceCommands.ts`

---

## ✨ Pro Tips

1. **Use natural speech** - System understands variations
2. **Speak clearly** - Better recognition = faster action
3. **Say "Help" often** - Easy way to discover commands
4. **Use shortcuts** - Faster than clicking sometimes
5. **Practice common commands** - Becomes automatic

---

**Happy voice commanding!** 🎉🎤

*Last updated: 2024*
*Voice features v1.0*

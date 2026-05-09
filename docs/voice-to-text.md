# Voice-to-Text Implementation Summary

## Overview

This document summarizes the voice-to-text feature implementation for the PerryTS chatroom application, including the technical architecture, platform-specific considerations, and comparison with voice messaging.

---

## Current Status

As of the current implementation, voice-to-text functionality is a **placeholder stub**. The actual speech recognition engine is not yet implemented in PerryTS. The feature demonstrates the UI flow but does not perform real speech-to-text conversion.

---

## Two Voice Input Flows

### Flow 1: Direct Voice-to-Text (Voice Recognizer Button)

**Location**: Text input row (🔊 button next to text field)

**User Experience**:
1. User clicks the voice-to-text button
2. Voice recognizer appears/activates
3. User speaks directly
4. Text appears in the input box in real-time

**Technical Architecture**:
```
Microphone → Real-time streaming → Speech Recognition Engine → Text
```

**Key Characteristics**:
- No audio file is saved
- Lower latency with immediate feedback
- Uses platform speech recognition APIs directly

**Current Implementation** ([main.ts:123-129](../src/main.ts)):
```typescript
const voiceToTextButton = Button("🔊", () => {
    showToast("Voice recognizer activated - speak now");
});
```

---

### Flow 2: Record-Then-Convert (Hold and Speak + Slide to Convert)

**Location**: Voice mode (Hold and Speak button)

**User Experience**:
1. User switches to voice mode
2. User holds "Hold and Speak" button to record
3. User either:
   - Releases to send as voice message
   - Slides to convert button to convert to text

**Technical Architecture**:
```
Microphone → audioStart() → WAV file recorded → Speech Recognition Engine → Text
```

**Key Characteristics**:
- Audio is saved to WAV file first
- Higher latency (must finish recording)
- User can review before sending

**Current Implementation** ([AudioRecorder.ts:189-205](../src/AudioRecorder.ts)):
```typescript
convert(): void {
    this.isRecording = false;
    audioStopRecording();
    audioStop();
    // ...
    if (this.onConvertCallback) {
        this.onConvertCallback(); // Sets placeholder text
    }
}
```

---

## Voice Message vs Voice-to-Text: Key Differences

| Aspect | Voice Message | Voice-to-Text |
|--------|---------------|---------------|
| **Final Output** | Audio file (.wav) | Text string |
| **Storage** | Requires file storage | Minimal text storage |
| **Transmission** | Larger payload | Small text payload |
| **Playback** | Requires audio player | Direct text display |
| **Accessibility** | Requires audio playback | Readable by all |
| **Latency** | Recording time + upload | Processing time |
| **Use Case** | Longer messages, tone/inflection | Quick dictation |

---

## Platform-Specific Implementation Requirements

### Android
- **Audio Capture**: `AudioRecord` (JNI)
- **Speech Recognition**: `android.speech.SpeechRecognizer`
- **Permissions**: `RECORD_AUDIO`, `INTERNET` (for cloud services)

### iOS/macOS
- **Audio Capture**: `AVAudioEngine`
- **Speech Recognition**: `Speech.framework`
- **Permissions**: Microphone, Speech Recognition

### Linux
- **Audio Capture**: PulseAudio (libpulse-simple)
- **Speech Recognition**: Vosk (recommended) or CMU PocketSphinx
- **Dependencies**: libasound2, libpulse, Vosk library

### Web
- **Audio Capture**: `getUserMedia` + `AnalyserNode`
- **Speech Recognition**: Web Speech API (`SpeechRecognition` interface)
- **Permissions**: Browser microphone permission

### Windows
- **Audio Capture**: WASAPI (shared mode)
- **Speech Recognition**: Windows Speech Recognition API
- **Permissions**: None required

---

## Proposed PerryTS API

```typescript

// Start real-time speech recognition
export function speechStart(
    callback: (text: string, isFinal: boolean) => void,
    options?: {
        language?: string;
        partialResults?: boolean;
    }
): number; // Returns session ID

// Stop speech recognition
export function speechStop(sessionId: number): void;

// Check if speech recognition is available on platform
export function speechIsAvailable(): boolean;

// Convert audio file to text (for record-then-convert flow)
export function speechConvertFile(
    filePath: string,
    callback: (text: string) => void
): void;
```

---

## Implementation Recommendations

1. **Phase 1**: Implement direct voice-to-text using platform-native APIs
2. **Phase 2**: Add record-then-convert functionality
3. **Phase 3**: Support offline recognition (Vosk on Linux/desktop)

### Priority Platforms
1. **Android** - Primary mobile platform with built-in SpeechRecognizer
2. **iOS** - Built-in Speech framework
3. **Web** - Web Speech API for browser support
4. **Linux/macOS** - Vosk for offline recognition
5. **Windows** - Windows Speech API

---

## Dependencies

### Required PerryTS Modules
- `perry/system` - Audio capture (already implemented)

### External Dependencies (Linux)
- Vosk library
- PulseAudio development libraries
- Appropriate language model files

---

## Future Enhancements

- Multi-language support
- Offline recognition capability
- Voice activity detection
- Speaker identification
- Noise reduction preprocessing

## Speech Recognition Architecture

Based on analysis of the codebase, here is the complete speech recognition architecture summary:

---

## Architecture Overview

The system has **two parallel audio pipelines** that can work together:

### 1. **Audio Capture Pipeline** (GTK4/Perry-UI)

Located in `perry/crates/perry-ui-gtk4/src/audio.rs`, this is the low-level audio layer running on Linux:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PulseAudio Stream                            │
│                  (48kHz, mono, Float32LE)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              A-Weighting Filter (for dB measurement)            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│  RMS/Peak Detection  │  │  WAVEFORM_BUFFER   │
│  → dB calculation   │  │  (256 samples)     │
└─────────────────────┘  └─────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Global Atomic State (CURRENT_DB, CURRENT_PEAK)                 │
│  + Optional AUDIO_CALLBACK for real-time sample forwarding      │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Real-time dB level metering with A-weighting filter
- Peak detection and waveform buffer for visualization
- Optional callback registration (`register_audio_callback`) for forwarding raw samples
- WAV file recording capability with PCM 16-bit output

---

### 2. **Speech Recognition Pipeline** (Vosk)

Located in `chatroom/extensions/perry-vosk/crate-linux/src/lib.rs`, this is the actual speech-to-text engine:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vosk Model (~48MB)                           │
│              (loaded from ~/.perry/model)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              vosk::Recognizer (16kHz mono)                       │
│                                                              │
│   accept_waveform() ──► Internal buffer                        │
│         │                      │                              │
│         ▼                      ▼                              │
│  partial_result() ◄─── Partial hypothesis                      │
│         │                      │                              │
│         ▼                      ▼                              │
│  final_result() ◄──── Complete utterance                        │
└─────────────────────────────────────────────────────────────────┘
```

**Key Processing Steps:**
1. **Downsampling**: 48kHz → 16kHz (Vosk requirement)
2. **Format conversion**: `f32` → `i16` PCM
3. **Incremental recognition**: via `accept_waveform()`
4. **Result extraction**: `partial_result()` for live feedback, `final_result()` for final text

---

### 3. **SpeechRecognizer Widget** (`src/SpeechRecognizer.ts`)

The new encapsulated widget that provides a clean interface for speech recognition:

```
┌─────────────────────────────────────────────────────────────────┐
│                   SpeechRecognizer Widget                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Button UI (🔊)                                           │  │
│  │  - Click to toggle recognition                           │  │
│  │  - Color changes: white=idle, green=active               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Internal State Management                                │  │
│  │  - isActive: boolean                                     │  │
│  │  - sessionId: number                                     │  │
│  │  - voskAvailable: number | null                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Backend Abstraction Layer                               │  │
│  │  ├── Vosk Extension (perry-vosk)                        │  │
│  │  └── Web Speech API (fallback)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│         ┌────────────────────┴────────────────────┐             │
│         ▼                                         ▼             │
│  onTextRecognized(text)                    onStatusChange(active)│
└─────────────────────────────────────────────────────────────────┘
```

**Widget API:**

| Method | Description |
|--------|-------------|
| `getWidget()` | Returns the underlying button widget for UI integration |
| `isSpeechActive()` | Checks if recognition is currently active |
| `stop()` | Stops speech recognition |
| `getSessionId()` | Returns current session ID |

**Constructor Options:**

| Option | Type | Description |
|--------|------|-------------|
| `onTextRecognized` | `(text: string) => void` | Called when speech is recognized |
| `onStatusChange` | `(isActive: boolean) => void` | Called when recognition starts/stops |

---

### 4. **Integration in Chatroom UI** (`src/main.ts`)

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                  │
│   ┌──────────────────┐  ┌──────────────┐    ┌──────────────┐   │
│   │  SpeechRecognizer│  │  🎤 Button   │    │   Send Msg   │   │
│   │    (🔊 Button)   │  │(AudioRecorder)│   │              │   │
│   └────────┬─────────┘  └──────┬───────┘    └──────┬───────┘   │
└────────────┼───────────────────┼───────────────────┼────────────┘
             │                   │                   │
             ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              AudioRecorder (AudioRecorder.ts)                   │
│                                                              │
│   audioStart() ──► audioGetLevel() ──► Visual waveform        │
│   audioStartRecording() ──► WAV file saved                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SpeechRecognizer                              │
│                                                              │
│   if perry-vosk available:                                    │
│     audioRegisterCallback(processSamples) ──► js_voskProcess   │
│     voskStart() ──► callback with transcript                    │
│   else if Web Speech API:                                       │
│     browser SpeechRecognition ──► callback with transcript     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Patterns

| Pattern | Purpose | Location |
|---------|---------|----------|
| **Dynamic Loading** | Graceful fallback if PulseAudio unavailable | `audio.rs` - uses FFI with null checks |
| **Atomic State** | Thread-safe communication between audio thread and UI | `audio.rs` - `CURRENT_DB`, `CURRENT_PEAK` |
| **Callback Registration** | Decouple audio capture from sample consumption | `audio.rs` - `AUDIO_CALLBACK` |
| **Fallback Chain** | Multiple SR backends (Vosk → Web Speech API) | `SpeechRecognizer.ts` |
| **Session Management** | Track multiple recognition sessions | `lib.rs` - `SESSION_ID`, `COUNTER` |
| **Downsampling** | Match audio rate to recognition engine requirement | `lib.rs` - 48kHz → 16kHz |
| **Widget Encapsulation** | Reusable speech recognition component | `SpeechRecognizer.ts` |

---

## Data Flow Summary

```
Microphone → PulseAudio (48kHz) 
    ├──► A-weight filter → dB metering → UI level meter
    │
    ├──► AUDIO_CALLBACK → SpeechRecognizer.processSamples() 
    │                              │
    │                              ▼
    │                    Downsample (48k→16kHz)
    │                    Convert (f32→i16 PCM)
    │                              │
    │                              ▼
    │                    Vosk accept_waveform()
    │                              │
    │                              ▼
    │                    partial_result() → onTextRecognized()
    │                                         │
    │                                         ▼
    │                                   UI Text Field
    │
    └──► WAV file (via AudioRecorder)
```

---

## Usage Example

```typescript
import { SpeechRecognizer } from "./SpeechRecognizer";

const speechRecognizer = new SpeechRecognizer({
    onTextRecognized: (text) => {
        console.log("Recognized:", text);
        // Update UI with recognized text
    },
    onStatusChange: (isActive) => {
        console.log("Speech recognition:", isActive ? "started" : "stopped");
    }
});

// Add to UI container
HStack(4, [textField, speechRecognizer.getWidget()]);

// Cleanup
speechRecognizer.stop();
```

The architecture cleanly separates concerns: **audio capture** (pulseaudio), **signal processing** (dB metering, A-weighting), **speech recognition** (Vosk), and **UI** (chatroom) are all independent modules connected via well-defined interfaces.
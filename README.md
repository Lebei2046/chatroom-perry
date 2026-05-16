# Chatroom

A cross-platform chatroom demo built with [PerryTS](https://docs.perryts.com), featuring text and voice messaging.

## Features

- **Text messaging**: Send text messages
- **Voice messaging**: Record and play voice messages
- **Real-time voice-to-text**: Convert voice to text input in real-time using Vosk speech recognition
- **Emoji picker**: Insert emojis in messages
- **Cross-platform support**: Runs on Linux, macOS, Windows, Android, iOS, and more
- **Native Linux support**: Works on native Linux with PulseAudio (not webview)

## Quick Start

### Prerequisites

- **Patched PerryTS**: This chatroom requires a patched version of Perry with WAV audio recording support. Check out a [patched-perry](https://github.com/Lebei2046/perry/tree/feature/voice-to-text-2).
- **Vosk Model** (for voice-to-text): Install the Vosk model for speech recognition:
  ```bash
  bash scripts/install-vosk-model.sh
  ```

### Run the App

```bash
cd chatroom
perry run
```

### Build for Production

```bash
perry compile src/main.ts -o chatroom
./chatroom
```

## Project Structure

```
chatroom/
├── src/
│   ├── main.ts          # Main application code
│   ├── AudioRecorder.ts # Audio recording functionality
│   └── SpeechRecognizer.ts # Speech recognition with Vosk
├── extensions/
│   └── perry-vosk/      # Vosk speech recognition extension
│       └── crate-linux/ # Native Linux implementation
├── scripts/
│   └── install-vosk-model.sh # Vosk model installation script
├── docs/                # Documentation in development
├── images/              # Screenshots and media for mockups(Wechat)
├── perry.toml           # Perry configuration
└── tsconfig.json        # TypeScript configuration
```

## License

MIT

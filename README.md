# Chatroom

A cross-platform chatroom demo built with PerryTS, featuring text and voice messaging.

## Features

- **Text messaging**: Send text messages
- **Voice messaging**: Record and play voice messages
- **Voice-to-text**: Convert voice to text input
- **Emoji picker**: Insert emojis in messages
- **Cross-platform support**: Runs on Linux, macOS, Windows, Android, iOS, and more

## Quick Start

### Prerequisites

- Node.js and npm
- **Patched PerryTS**: This chatroom requires a patched version of Perry with WAV audio recording support. Check out a [patched-perry](https://github.com/Lebei2046/perry.git).

### Run the App

```bash
cd chatroom
perry dev
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
│   └── AudioRecorder.ts # Audio recording functionality
├── docs/                # Documentation
├── images/              # Screenshots and media for mockups
├── perry.toml           # Perry configuration
└── tsconfig.json        # TypeScript configuration
```

## License

MIT

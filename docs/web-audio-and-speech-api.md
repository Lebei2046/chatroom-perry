# Web Audio and Speech API Summary

This document summarizes the web APIs used in the chatroom application for audio, speech recognition, and audio capture.

## Web Speech API

### Speech Recognition (SpeechRecognition)
Converts spoken language to text.

**Key Features:**
- Continuous listening mode
- Interim results (partial transcriptions)
- Language support
- Event-driven architecture

**Main Events:**
- `result` - when speech is recognized
- `start` - when recognition starts
- `end` - when recognition ends
- `error` - on errors

**Example Usage:**
```javascript
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  console.log('Recognized:', transcript);
};

recognition.start();
```

### Speech Synthesis (SpeechSynthesis)
Converts text to spoken language.

**Key Features:**
- Multiple voice support
- Pitch, rate, and volume control
- Queued utterances

**Example Usage:**
```javascript
const utterance = new SpeechSynthesisUtterance('Hello, world!');
utterance.lang = 'en-US';
utterance.rate = 1.0;
utterance.pitch = 1.0;

speechSynthesis.speak(utterance);
```

## Web Audio API
A powerful system for controlling audio on the web, creating complex audio visualizations, and processing audio.

**Core Concepts:**
- **AudioContext**: The main entry point for the API
- **Nodes**: Building blocks that process audio (source, processing, destination)
- **Graphs**: Nodes connected together to process audio

**Common Node Types:**
- **Source Nodes**: `AudioBufferSourceNode`, `OscillatorNode`, `MediaStreamAudioSourceNode`
- **Processing Nodes**: `GainNode`, `BiquadFilterNode`, `DelayNode`, `ConvolverNode`
- **Destination Nodes**: `AudioDestinationNode` (speaker output)

**Example Usage:**
```javascript
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

oscillator.start();
oscillator.stop(audioContext.currentTime + 1);
```

## Web Audio Capturing API
Technologies for capturing audio from microphones or other audio sources in the browser.

### MediaDevices.getUserMedia()
Primary API for capturing audio from a user's microphone.

**Example Usage:**
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('Microphone access granted');
    // Use the stream
  })
  .catch(err => {
    console.error('Microphone access denied:', err);
  });
```

**Audio Capture Options:**
```javascript
const audioConstraints = {
  audio: {
    echoCancellation: true,     // Reduces echo
    noiseSuppression: true,     // Reduces background noise
    autoGainControl: true,       // Automatically adjusts gain
    sampleRate: 44100,           // Sample rate in Hz
    channelCount: 1,             // Mono (1) or stereo (2)
    sampleSize: 16               // Sample size in bits
  }
};
```

### Integrating with Web Audio API
```javascript
async function setupAudioCapture() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const sourceNode = audioContext.createMediaStreamSource(stream);
  
  const analyser = audioContext.createAnalyser();
  sourceNode.connect(analyser);
  
  // Optionally connect to speakers
  analyser.connect(audioContext.destination);
}
```

### Recording Audio with MediaRecorder
```javascript
async function recordAudio() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus'
  });
  
  const chunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    // Play or download the recording
  };
  
  mediaRecorder.start();
  return mediaRecorder;
}
```

### Modern Audio Processing with AudioWorklet
**Main thread:**
```javascript
await audioContext.audioWorklet.addModule('audio-processor.js');
const processor = new AudioWorkletNode(audioContext, 'custom-processor');
sourceNode.connect(processor);
processor.connect(audioContext.destination);
```

**audio-processor.js:**
```javascript
class CustomProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i]; // Process audio here
    }
    return true;
  }
}
registerProcessor('custom-processor', CustomProcessor);
```

## Browser Support
| API | Support |
|-----|---------|
| getUserMedia | All modern browsers (Chrome, Firefox, Safari, Edge) |
| MediaRecorder | Most modern browsers (Firefox, Chrome, Edge; Safari 14.1+) |
| AudioWorklet | Modern browsers (Chrome, Firefox, Edge; Safari 14.1+) |
| Speech Recognition | Limited support (Chrome, Edge, Safari with flags) |
| Speech Synthesis | Wide support across all major browsers |
| Web Audio API | Wide support across all major browsers |

## Security Considerations
- Requires HTTPS (except localhost for development)
- User must explicitly grant microphone access
- Best practices:
  - Explain why microphone access is needed
  - Provide clear UI for when recording is active
  - Stop recording when not needed
  - Release resources properly

## Checking Browser Support
```javascript
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  console.error('getUserMedia not supported');
}
if (typeof MediaRecorder === 'undefined') {
  console.error('MediaRecorder not supported');
}
if (typeof AudioWorklet === 'undefined') {
  console.error('AudioWorklet not supported');
}
```

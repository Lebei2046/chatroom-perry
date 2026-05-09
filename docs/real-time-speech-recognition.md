You're right. The accuracy difference between file-based recognition and real-time speech recognition is expected. Let me explain why and how we can improve it:

Why file recognition is more accurate:

1. Complete audio context - When processing a file, Vosk has all the audio upfront and can use the full context for recognition
2. Single final result - File recognition calls final_result() once on the complete audio
3. No intermediate state - The recognizer doesn't need to produce partial results
Why real-time recognition is less accurate:

1. Partial results - We're showing partial_result() which is Vosk's best guess so far, not finalized
2. Incremental processing - Audio is fed in chunks, and the recognizer makes decisions with limited context
3. Continuous state - The recognizer maintains state across chunks
Options to improve real-time accuracy:

1. Only show final result when stopping (most accurate, no real-time feedback)
2. Show partial results but emphasize final result (current approach)
3. Use a hybrid approach - accumulate audio and periodically finalize utterances

Let me explain how partial results work in real-time speech recognition based on our implementation:

## Real-Time Speech Recognition with Partial Results

### 1. Audio Capture and Processing Loop

The recognition process runs in a dedicated background thread with this continuous loop:

```rust
while SPEECH_RUNNING.load(Ordering::Relaxed) {
    let samples = crate::audio::get_recorded_samples_since_last_call();
    if !samples.is_empty() {
        // Downsample from 48kHz to 16kHz (Vosk requirement)
        let downsampled = downsample(&samples, 48000, 16000);
        // Convert to PCM bytes (16-bit, little-endian)
        let pcm_bytes: Vec<u8> = downsampled
            .iter()
            .flat_map(|&f| {
                let sample = (f * i16::MAX as f32) as i16;
                sample.to_le_bytes()
            })
            .collect();
        // Feed audio to Vosk
        rec_clone.accept_waveform(&pcm_bytes);
    }
}
```

### 2. How Vosk Generates Partial Results

When audio is fed to Vosk via `accept_waveform()`, the recognizer:
- **Accumulates** audio data in an internal buffer
- **Processes** it incrementally using its language model
- **Maintains** state about what it's heard so far
- **Returns** `partial_result()` - the current best guess of what was said

### 3. Partial Result Format

Vosk returns partial results as JSON:
```json
{
    "partial": "hello wo"
}
```

Our code extracts this:
```rust
fn partial_result(&self) -> Option<String> {
    // Calls vosk_recognizer_partial_result()
    // Parses JSON and extracts the "partial" field
    if let Some(partial) = json.get("partial").and_then(|v| v.as_str()) {
        if !partial.is_empty() {
            return Some(partial.to_string());
        }
    }
    None
}
```

### 4. Deduplication Mechanism

To avoid spamming identical results, we track the last reported text:

```rust
let mut last_text = String::new();
if let Some(text) = rec_clone.partial_result() {
    if text != last_text {
        last_text = text.clone();
        on_result(text);  // Only notify on changes
    }
}
```

### 5. Typical Recognition Flow

When speaking "hello world":

| Time | Vosk Partial Result | UI Display |
|------|---------------------|------------|
| T0 | "" (silence) | - |
| T1 | "h" | "h" |
| T2 | "he" | "he" |
| T3 | "hel" | "hel" |
| T4 | "hell" | "hell" |
| T5 | "hello" | "hello" |
| T6 | "hello " | "hello " |
| T7 | "hello w" | "hello w" |
| T8 | "hello wo" | "hello wo" |
| T9 | "hello wor" | "hello wor" |
| T10 | "hello worl" | "hello worl" |
| T11 | "hello world" | "hello world" |

### 6. Transition to Final Result

When `stop_recognition()` is called:
1. The loop exits
2. `final_result()` is called, which:
   - Returns the **final, confirmed** recognition
   - Flushes the internal buffer
   - Resets the recognizer state for next use

```rust
if let Some(text) = rec_clone.final_result() {
    if !text.is_empty() {
        on_result(text);
    }
}
```

### Key Differences: Partial vs Final Results

| Feature | Partial Result | Final Result |
|---------|---------------|--------------|
| **Type** | Interim guess | Confirmed result |
| **Timing** | During speech | After speech ends |
| **Accuracy** | Lower (work in progress) | Higher (full context) |
| **State Change** | None | Resets recognizer |
| **Use Case** | Real-time feedback | Final transcript |

### Why Partial Results are Less Accurate

1. **Limited context** - Vosk makes decisions with incomplete audio
2. **No confidence threshold** - Partial results are always returned
3. **Dynamic updates** - Results can change dramatically as more audio arrives

This is why file-based recognition (which uses only `final_result()` on complete audio) is always more accurate than real-time partial results.
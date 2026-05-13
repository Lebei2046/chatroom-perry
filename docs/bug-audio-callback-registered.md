I wrote voice-to-text(real-time and wav-file) for [chatroom-perry](https://github.com/Lebei2046/chatroom-perry).

- add audio callback mechanism for voice-to-text processing in a patched perry
- add an extention to integrate vosk in chatroom-perry

Converting a wav-file to text works fine. However, real-time voice-to-text does not work.

Here is the [Speech Recognition Architecture](https://github.com/Lebei2046/chatroom-perry/blob/main/docs/speech-recognition-arch.md)

## Bug: Register audio callback as NaN

```log
[SpeechRecognizer] Session started, testing audio system
[SpeechRecognizer] Session started, registering audio callback
[LIB] perry_system_audio_register_callback called! callback=NaN
[audio] register_audio_callback called, callback: NaN
[audio] AUDIO_CALLBACK mutex is being updated
[audio] AUDIO_CALLBACK has been set to: Some(NaN)
[SpeechRecognizer] Starting audio
[SpeechRecognizer] Returning true
```

## Add audio callback mechanism for voice-to-text processing

- Add register_audio_callback FFI function for real-time audio processing
- Implement js_closure_call2 for passing audio samples to JS callbacks
- Update compile/link/resolve commands to support voice-to-text workflow
- Add TypeScript bindings for audio callback registration

```rust
pub unsafe extern "C" fn register_audio_callback(callback: f64) {
    eprintln!("[audio] register_audio_callback called, callback: {:?}", callback);
    eprintln!("[audio] AUDIO_CALLBACK mutex is being updated");
    *AUDIO_CALLBACK.lock().unwrap() = Some(callback);
    eprintln!("[audio] AUDIO_CALLBACK has been set to: {:?}", *AUDIO_CALLBACK.lock().unwrap());
}
```

Check [audio.rs](https://github.com/Lebei2046/perry/blob/feature/voice-to-text/crates/perry-ui-gtk4/src/audio.rs) for the implementation of register_audio_callback.

## Register audio callback in TypeScript

```typescript
console.log("[SpeechRecognizer] Session started, registering audio callback");
audioRegisterCallback((samplesPtr: any, numSamples: number) => {
    this.sampleCount += numSamples;
    if (this.sampleCount % (48000 * 2) === 0) {
        console.log("[SpeechRecognizer] Audio callback called, total samples:", this.sampleCount);
    }
    voskProcessSamples(samplesPtr, numSamples);
});
console.log("[SpeechRecognizer] Starting audio");
audioStart();
console.log("[SpeechRecognizer] Returning true");
```

Check [SpeechRecognizer.ts](https://github.com/Lebei2046/chatroom-perry/blob/main/src/SpeechRecognizer.ts) for the call of audioRegisterCallback.

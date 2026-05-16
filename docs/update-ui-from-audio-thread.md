Based on my analysis of the codebase, there are several patterns for updating UI from audio/background threads in PerryTS. Here are the key approaches:

## 1. **Event Pump + Notification Pattern** (Current Vosk Approach)
The pattern currently used by Vosk:
- **Audio thread**: Push results to a thread-safe queue, then call `js_notify_main_thread()`
- **Main thread**: Timer pump drains the queue and fires JS callbacks
- **Files**: [`perry-runtime/src/event_pump.rs`](file:///home/lebei/dev/perryts/perry/crates/perry-runtime/src/event_pump.rs), [`perry-vosk/crate-linux/src/lib.rs`](file:///home/lebei/dev/perryts/chatroom/extensions/perry-vosk/crate-linux/src/lib.rs)

```rust
// Audio thread
fn send_to_js(closure: i64, text: &str) {
    let mut pending = PENDING_RECOGNITIONS.lock().unwrap();
    pending.push(PendingRecognition { callback: closure, text: text.to_string() });
    unsafe { js_notify_main_thread(); }  // Wake main thread
}
```

## 2. **glib::idle_add_local Pattern**
Used in media playback for scheduling work on the GLib main thread:

```rust
// Schedule work to run on main thread
glib::timeout_add_local(std::time::Duration::from_millis(100), || {
    poll_tick();  // Runs on main thread
    glib::ControlFlow::Continue
});
```

- **File**: [`perry-ui-gtk4/src/media_playback.rs`](file:///home/lebei/dev/perryts/perry/crates/perry-ui-gtk4/src/media_playback.rs#L391)
- **Bus listener** also uses `add_watch_local()` which ensures callbacks run on main thread

## 3. **Channel-Based Communication** (MPRIS Pattern)
Separate threads communicate via channels, with main thread draining:

```rust
// D-Bus thread sends commands to main thread
enum Command { Play, Pause, Seek(f64), ... }
let (cmd_tx, cmd_rx) = mpsc::channel::<Command>();

// Main thread drains in poll_tick
while let Ok(cmd) = rx.try_recv() {
    match cmd {
        Command::Play => super::play(handle),
        Command::Pause => super::pause(handle),
        ...
    }
}
```

- **File**: [`perry-ui-gtk4/src/media_playback.rs`](file:///home/lebei/dev/perryts/perry/crates/perry-ui-gtk4/src/media_playback.rs#L546-L744)

## 4. **Atomic Flags + Polling Pattern**
Background threads set atomic flags, main thread polls them:

```rust
// Background thread sets flag
static ENDED: AtomicBool = AtomicBool::new(false);
ENDED.store(true, Ordering::Relaxed);

// Main thread polls in timer tick
if entry.ended.load(Ordering::Relaxed) {
    return MediaState::Ended;
}
```

- **File**: [`perry-ui-gtk4/src/media_playback.rs`](file:///home/lebei/dev/perryts/perry/crates/perry-ui-gtk4/src/media_playback.rs#L370-L371)

## 5. **Direct GLib Bus Watch**
For GStreamer bus messages, uses `add_watch_local()` to ensure callbacks run on main thread:

```rust
bus.add_watch_local(move |_bus, msg| {
    match msg.view() {
        MessageView::Eos(_) => ended.store(true, Ordering::Relaxed),
        MessageView::Error(_) => error.store(true, Ordering::Relaxed),
        _ => {}
    }
    gstreamer::glib::ControlFlow::Continue
});
```

## Comparison of Approaches

| Pattern | Latency | Complexity | Use Case |
|---------|---------|------------|----------|
| **Event Pump** | Low (~8ms) | Medium | Real-time updates (speech-to-text) |
| **idle_add_local** | Low | Low | Simple one-off UI updates |
| **Channel + Drain** | Medium (~100ms) | Medium | Command-based updates |
| **Atomic + Poll** | Medium (~100ms) | Low | State flag updates |
| **Bus Watch** | Low | Medium | GStreamer integration |

## Recommendation for Your Use Case

For **real-time speech-to-text**, the **event pump pattern** is optimal because:
- Low latency (8ms tick vs 100ms poll)
- Thread-safe queue prevents race conditions
- `js_notify_main_thread()` wakes the main thread immediately when new results arrive
- Already integrated with the existing Vosk extension

The current implementation is well-suited for your needs! The architecture correctly separates audio processing (background thread) from UI updates (main thread) while maintaining real-time responsiveness.
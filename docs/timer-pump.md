## Real-Time Speech-to-Text Fix

### Root Cause

The GTK4 event loop was missing a timer pump that processes pending callbacks (`setInterval`, `setTimeout`, and other deferred work). On macOS, Windows, and other platforms, this pump runs periodically, but it was missing on Linux/GTK4.

### Solution: Generic Extension Pump Registration

Instead of hard-coding Vosk-specific logic into Perry core, we implemented a **generic extension pump registration mechanism** similar to the existing `js_register_stdlib_pump` pattern. This allows extensions to register pump functions that run on each timer tick without coupling to Perry core.

### Architecture

#### 1. Perry Runtime (Generic Extension Pump)

**File: `perry/crates/perry-runtime/src/lib.rs`**

Added a generic extension pump registration mechanism:

```rust
mod ext_pump {
    use std::ptr::null_mut;
    use std::sync::atomic::{AtomicPtr, Ordering};

    static EXT_PUMP_FN: AtomicPtr<()> = AtomicPtr::new(null_mut());

    #[no_mangle]
    pub extern "C" fn js_register_ext_pump(f: extern "C" fn() -> i32) {
        EXT_PUMP_FN.store(f as *mut (), Ordering::Release);
    }

    #[no_mangle]
    pub extern "C" fn js_run_ext_pump() {
        let f = EXT_PUMP_FN.load(Ordering::Acquire);
        if !f.is_null() {
            unsafe {
                let func: extern "C" fn() -> i32 = std::mem::transmute(f);
                func();
            }
        }
    }
}
```

#### 2. GTK4 Timer Pump

**File: `perry/crates/perry-ui-gtk4/src/app.rs`**

Added `js_run_ext_pump()` to the timer pump (generic, not Vosk-specific):

```rust
glib::timeout_add_local(std::time::Duration::from_millis(8), move || {
    unsafe {
        js_callback_timer_tick();
        js_interval_timer_tick();
        js_run_ext_pump();  // Generic extension pump
        js_run_stdlib_pump();
        js_promise_run_microtasks();
    }
    glib::ControlFlow::Continue
});
```

#### 3. Vosk Extension (Self-Registration)

**File: `chatroom/extensions/perry-vosk/crate-linux/src/lib.rs`**

When speech recognition starts, Vosk registers its pump function:

```rust
extern "C" {
    fn js_notify_main_thread();
    fn js_register_ext_pump(f: extern "C" fn() -> i32);
}

static PUMP_REGISTERED: AtomicBool = AtomicBool::new(false);

#[no_mangle]
pub unsafe extern "C" fn vosk_start(callback: f64) -> i64 {
    // ... existing initialization code ...

    if !PUMP_REGISTERED.load(Ordering::Relaxed) {
        js_register_ext_pump(vosk_process_pending);
        PUMP_REGISTERED.store(true, Ordering::Relaxed);
        eprintln!("[VOSK] Registered pump function");
    }

    session_id as i64
}
```

### How It Works

1. **GTK4 timer pump** runs every 8ms (~120Hz)
2. Timer pump calls `js_run_ext_pump()` (generic, no-op if nothing registered)
3. When speech recognition starts, **Vosk registers** `vosk_process_pending` via `js_register_ext_pump()`
4. Audio processing happens on a **separate thread** (no UI blocking)
5. Speech recognition results are **queued** instead of calling callbacks directly
6. GTK4 timer pump calls `vosk_process_pending()` on the main thread
7. JavaScript callbacks are called and **UI updates** happen in the GTK4 event loop context
8. Real-time text is displayed **during speech**, not just when stopping

### Files Modified

#### Perry Core (Generic, Reusable)

1. **`perry/crates/perry-runtime/src/lib.rs`** - Added generic `ext_pump` module with `js_register_ext_pump()` and `js_run_ext_pump()`
2. **`perry/crates/perry-ui-gtk4/src/app.rs`** - Added `js_run_ext_pump()` to timer pump (this is a **one-time infrastructure addition**)

#### Vosk Extension (Application-Specific)

3. **`chatroom/extensions/perry-vosk/crate-linux/src/lib.rs`** - Vosk registers its pump function when speech starts
4. **`chatroom/extensions/perry-vosk/src/index.ts`** - TypeScript bindings for `voskProcessPending`

### Benefits

- **No coupling**: Perry core doesn't know about Vosk
- **Generic**: Any extension can use the pump registration mechanism
- **Thread-safe**: Results processed on main thread
- **Real-time**: Text updates displayed during speech recognition
- **No UI blocking**: Audio runs on separate thread

The real-time speech-to-text now works correctly - text updates are displayed during speech recognition without blocking the UI!


## Why Not Use `stdlib_pump` Directly?

Looking at [`perry/crates/perry-runtime/src/lib.rs`](file:///home/lebei/dev/perryts/perry/crates/perry-runtime/src/lib.rs#L190-L245):

```rust
pub extern "C" fn js_run_stdlib_pump() {
    // Drain the tty resize-pending flag (#347 Phase 3). Lives in
    // perry-runtime, not stdlib, so it runs even when stdlib isn't
    // linked — a TUI program that uses process.stdout.on('resize')
    // without importing any stdlib module still sees its callback
    // fire on SIGWINCH.
    crate::tty::js_tty_resize_drain();  // ← This is stdlib-specific!
    
    let f = STDLIB_PUMP_FN.load(Ordering::Acquire);
    if !f.is_null() {
        unsafe {
            let func: extern "C" fn() -> i32 = std::mem::transmute(f);
            func();
        }
    }
}
```

Notice:
1. `js_run_stdlib_pump()` calls `crate::tty::js_tty_resize_drain()` **before** the registered pump
2. It also has related functions like `js_register_stdlib_has_active` and `js_stdlib_has_active_handles`

## Why Create a Separate `ext_pump`?

1. **Semantic separation**:
   - `stdlib_pump` = for the **standard library**
   - `ext_pump` = for **external extensions** (like Vosk)

2. **Future-proofing**: If stdlib pump ever gets more stdlib-specific logic, our extension pump won't inherit it accidentally

3. **Cleaner architecture**: Separate mechanisms for separate concerns

## But Actually... You Could Just Use `stdlib_pump`

If you want to be simpler and reuse the existing mechanism, we could:

1. Remove `ext_pump` entirely
2. Have Vosk call `js_register_stdlib_pump(vosk_process_pending)`

Even though it's called "stdlib_pump", it **would work fine** for Vosk - the TTY resize drain is harmless to call even when you don't need it.

Want me to simplify it and just use `stdlib_pump` directly?
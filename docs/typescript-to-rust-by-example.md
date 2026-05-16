## Summary: How `set_output_filename` becomes `setOutputFilename` for Native Linux

### The Complete Chain

```
TypeScript (audioSetOutputFilename)
         ↓
PERRY_SYSTEM_TABLE (perry-dispatch/src/lib.rs:2140)
         ↓
perry-codegen (lower_call.rs → LLVM backend)
         ↓
perry_ui_gtk4 (#[no_mangle] extern "C" wrapper in lib.rs)
         ↓
audio::set_output_filename (actual implementation in audio.rs)
```

### Step-by-Step Details

#### 1. **TypeScript Declaration** (`types/perry/system/index.d.ts`)
```typescript
export function audioSetOutputFilename(filename: string): void;
```

#### 2. **Dispatch Table** (`perry-dispatch/src/lib.rs:2140-2144`)
```rust
MethodRow {
    method: "audioSetOutputFilename",     // TS name (camelCase)
    runtime: "perry_system_audio_set_output_filename",  // C symbol
    args: &[ArgKind::Str],                // String argument
    ret: ReturnKind::Void,
},
```

#### 3. **FFI Wrapper** (`perry-ui-gtk4/src/lib.rs:1942-1955`)
```rust
#[no_mangle]
pub extern "C" fn perry_system_audio_set_output_filename(filename_ptr: i64) {
    fn str_from_header(ptr: *const u8) -> &'static str { ... }
    let filename = str_from_header(filename_ptr as *const u8);
    audio::set_output_filename(filename);  // Calls the actual impl
}
```

#### 4. **Implementation** (`perry-ui-gtk4/src/audio.rs:205-209`)
```rust
pub fn set_output_filename(filename: &str) {
    let mut slot = OUTPUT_FILENAME.lock().unwrap();
    slot.clear();
    slot.push_str(filename);
}
```

### Key Insight

**The conversion is manual via the dispatch table** (`PERRY_SYSTEM_TABLE`). Each entry explicitly maps:
- `method`: TS name (camelCase) e.g. `"audioSetOutputFilename"`
- `runtime`: C symbol (snake_case) e.g. `"perry_system_audio_set_output_filename"`

There's no automatic `set_output_filename` → `setOutputFilename` conversion - it's a **manual lookup table** maintained in `perry-dispatch/src/lib.rs`.
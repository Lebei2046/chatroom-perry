Here's a comprehensive explanation of how TypeScript and Rust work together in Perry:

## 1. **TypeScript Code → Compiled LLVM → Native Binary**
Perry compiles TypeScript code into native binaries using a multi-step process:

- **TypeScript → HIR (High-Level Intermediate Representation)**: The TypeScript source is parsed and transformed into HIR in `perry-hir`
- **HIR → LLVM IR**: The `perry-codegen` crate compiles HIR into LLVM Intermediate Representation
- **LLVM IR → Object File**: LLVM converts the IR into platform-specific object files
- **Linking**: Objects are linked with `libperry_runtime.a` (from `perry-runtime`) and any native extension libraries

## 2. **NaN-boxing: The Key Value Representation**
At the core of the TypeScript-Rust integration is **NaN-boxing** (implemented in `perry-runtime/src/value.rs`):
- All JavaScript values (numbers, strings, objects, booleans, null, undefined) are encoded in a single 64-bit float (`f64`)
- Specific bit patterns (tags) identify the value type:
  - `0x7FF8-0x7FFF` (top 16 bits): Tag values (not regular numbers)
  - `0x7FFD`: Object/array pointers (48-bit payload)
  - `0x7FFE`: i32 integers (32-bit payload)
  - `0x7FFF`: Heap string pointers (48-bit payload)
  - `0x7FF9`: Short strings (inline 5 bytes)
  - `0x7FFC`: Special singletons (undefined, null, true, false, hole)

## 3. **FFI Layer: TypeScript Calls Rust Functions**
Perry uses a Foreign Function Interface (FFI) to let TypeScript code call into Rust:

### **A. Rust Exports: `extern "C" Functions`**
Rust functions are exposed to TypeScript via `#[no_mangle] extern "C"` functions, typically named like:
- `perry_ui_*`: For UI components and operations
- `perry_system_*`: For system-level functions
- `perry_i18n_*`: For internationalization
- Custom extension names (like `vosk_*` from your example)

Example (from `perry-ui-gtk4/src/lib.rs`):
```rust
#[no_mangle]
pub extern "C" fn perry_ui_text_create(title_ptr: i64) -> i64 {
    // ... Rust implementation ...
}
```

### **B. Dispatch Tables: Mapping TypeScript to Rust**
The `perry-dispatch` crate contains central tables that map TypeScript function calls to their Rust implementations:
- `PERRY_UI_TABLE`: UI constructors and methods
- `PERRY_UI_INSTANCE_TABLE`: UI instance methods
- `PERRY_SYSTEM_TABLE`: System functions
- `NATIVE_MODULE_TABLE`: Native module calls

## 4. **Calling Between TypeScript and Rust**
### **TypeScript → Rust**
When TypeScript calls a function like `audioStart()`, the Perry compiler:
1. Looks up the function in the dispatch table to find the Rust symbol
2. Generates LLVM code that calls the Rust `extern "C" function`
3. Converts arguments to the expected format (NaN-boxed)
4. Converts the return value back from Rust to NaN-boxed form

### **Rust → TypeScript**
Rust can call TypeScript closures using helper functions like:
- `js_closure_call0`
- `js_closure_call1`
- `js_closure_call2`
- etc.

These functions accept a closure pointer (NaN-boxed) and call the corresponding TypeScript function.

## 5. **Native Extensions**
Perry supports writing native extensions in Rust (like your `perry-vosk` example):
- Extensions declare functions in TypeScript (`.d.ts` files)
- Rust implements these as `extern "C" functions`
- `package.json` declares the native library
- Perry links the extension into the final binary

## 6. **Memory Management**
- Perry uses a garbage collector (GC) for JavaScript objects (strings, arrays, objects)
- The GC manages memory in an arena allocator for efficiency
- Rust code can allocate JavaScript objects using `perry-ffi` or `perry-runtime` helpers
- The GC automatically reclaims unreachable objects

This architecture allows TypeScript to leverage Rust's performance and system access, while maintaining JavaScript's ease of use!
Looking back at this debugging session, here are the key lessons I learned:

## 1. **Linux Linker Symbol Resolution Order**

The most critical insight: On Linux, the linker resolves symbols **left-to-right**. A library can only satisfy symbols that appear *later* in the command line, not earlier.

This means:
```bash
# WRONG: libperry_vosk.a references vosk symbols, but -lvosk comes after
ld ... libperry_vosk.a ... -lvosk

# CORRECT: -lvosk must come BEFORE the library that needs it
ld ... -lvosk ... libperry_vosk.a
```

## 2. **FFI Naming Convention Pattern**

Perry follows a simple pattern for native library FFI:
- `package.json` declares function names
- TypeScript declares them with `declare function`
- Rust exports them with `#[no_mangle]`
- Use snake_case for Rust naming (e.g., `vosk_start`, not `voskStart`)

## 3. **Static vs Shared Library Linking**

- `libvosk.a` (static) - archived object files, linked at compile time
- `libvosk.so` (shared) - dynamically linked at runtime
- Rust's `#[link(name = "vosk")]` tries static first, falls back to shared
- On Linux, if only `.so` exists, it still works via dynamic linking

## 4. **Perry Manifest Structure**

The `perry.nativeLibrary` in `package.json` controls:
- `functions[]` - FFI function signatures
- `targets.<platform>.lib` - native library to link
- `targets.<platform>.libs[]` - **platform-specific dependencies** (critical!)

## 5. **Debugging Linker "undefined symbol" Errors**

When you see:
```
ld: error: undefined symbol: vosk_model_new
>>> referenced by ...libperry_vosk.a
```

It means the library containing `vosk_model_new` isn't linked, OR it's linked in the wrong order after the library that references it.
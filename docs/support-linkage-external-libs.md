When writing an extension depending on external libraries, like `libvosk.so`, Perry compiler needs to know where to find them. To do this, you need to config the compiler behavior.

---

The user is asking if we can get the library search paths and link libraries from the build.rs script instead of configuring them in package.json. Let's check what information we can get from Cargo and the build output.
          
## Yes, but it would be more complex

When Cargo builds a native library, the `build.rs` outputs:
- `cargo:rustc-link-search=native=/path/to/lib` (library search paths)  
- `cargo:rustc-link-lib=name` (libraries to link)

However, **Cargo doesn't store these outputs in an easily parsable file** after building. They're just printed to stdout.

### Option 1: Parse Cargo build output (not recommended)
We could run Cargo, capture the output, and parse the `cargo:` directives. But this is:
- Brittle (Cargo output format could change)
- Slow (would require building the crate twice)

### Option 2: Keep both libDirs/libs in package.json ([current approach](https://github.com/Lebei2046/chatroom-perry/blob/main/extensions/perry-vosk/package.json))
This is explicit, predictable, and works consistently.

### Option 3: Extract and run the logic from build.rs
We could re-implement the same library discovery logic in Perry, but that duplicates effort.

---

**My recommendation:** Keep the current approach with `libDirs` and `libs` in package.json. It's:
- Simple to understand
- Explicit and predictable
- Doesn't require parsing Cargo output
- Easy to override if needed

If you want to avoid duplication, you could:
1. Keep the minimal necessary in package.json
2. Use environment variables for dynamic paths
3. Or, we could enhance Perry to optionally read from `build.rs` logic (but that would be more complex)

What do you think?
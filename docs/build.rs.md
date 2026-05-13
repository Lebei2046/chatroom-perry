## Why `build.rs` is critical:

**`build.rs` is a special file name recognized by Cargo**. When Cargo sees it:

1. It compiles `build.rs` into an executable
2. Runs that executable **before** compiling your main code
3. The build script can emit special directives via `println!()` that Cargo interprets

### In your `build.rs`, this line is essential:
```rust
println!("cargo:rustc-link-lib=vosk");
```

This tells Cargo to pass `-lvosk` to the linker, which links your code against `libvosk.so`.

### If you rename `build.rs`:
- Cargo won't find it (it only looks for exactly `build.rs`)
- The `cargo:rustc-link-lib=vosk` directive won't be emitted
- The linker won't know to link `libvosk`
- You get **undefined symbol errors** for vosk functions

### Proof it works now:
```bash
# With build.rs (works):
cargo test --test convert_file_test -- --nocapture  # Success - links against libvosk

# Without build.rs (fails):  
cargo test --test convert_file_test -- --nocapture # Error - undefined symbols: vosk_model_new, etc.
```

So **never rename `build.rs`** - it's not just a random file, it's Cargo's build script convention!
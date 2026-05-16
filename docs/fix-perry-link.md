## `build.rs` in Rust

`build.rs` instructs the rust compiler to where to search the external `libvosk` library.

If you rename `build.rs` to `build.rs.bak`, the compiler will not link against the external `libvosk` library.

```bash
# In `chatroom/extensions/perry-vosk/crate-linux` dir
cargo test --test convert_file_test -- --nocapture
```

failed with the following error:

```log
error: linking with `cc` failed: exit status: 1
  |
  = note:  "cc" "-Wl,--version-script=/tmp/rustcEkEyLw/list" "-Wl,--no-undefined-version" "-m64" "/tmp/rustcEkEyLw/symbols.o" "<51 object files omitted>" "-Wl,--as-needed" "-Wl,-Bstatic" "/home/lebei/dev/perryts/chatroom/extensions/perry-vosk/crate-linux/target/x86_64-unknown-linux-gnu/debug/deps/{libhound-5c369858975389bd,
  libcore-*,libcompiler_builtins-*}.rlib" "-Wl,-Bdynamic" "-lvosk" "-lgcc_s" "-lutil" "-lrt" "-lpthread" "-lm" "-ldl" "-lc" "-L" "/tmp/rustcEkEyLw/raw-dylibs" "-B<sysroot>/lib/rustlib/x86_64-unknown-linux-gnu/bin/gcc-ld" "-fuse-ld=lld" "-Wl,--eh-frame-hdr" "-Wl,-z,noexecstack" "-L" "/home/lebei/dev/perryts/chatroom/extensions/perry-vosk/crate-linux/target/x86_64-unknown-linux-gnu/debug/build/libmimalloc-sys-af90eeea7d332bb7/out" "-L" "<sysroot>/lib/rustlib/x86_64-unknown-linux-gnu/lib" "-o" "/home/lebei/dev/perryts/chatroom/extensions/perry-vosk/crate-linux/target/x86_64-unknown-linux-gnu/debug/deps/libperry_vosk.so" "-Wl,--gc-sections" "-shared" "-Wl,-z,relro,-z,now" "-nodefaultlibs"
  = note: some arguments are omitted. use `--verbose` to show all linker arguments
  = note: rust-lld: error: unable to find library -lvosk
          collect2: error: ld returned 1 exit status
```

## Link failed in Perry

```bash
# In `chatroom` dir
../perry/target/x86_64-unknown-linux-gnu/release/perry run tests/test-vosk-convert-file.ts
 ```

```log
Linking native library: /home/lebei/dev/perryts/chatroom/extensions/perry-vosk/crate-linux/target/x86_64-unknown-linux-gnu/release/libperry_vosk.a
ld: error: unable to find library -lvosk
collect2: error: ld returned 1 exit status
Error: Linking failed

```
## Change link behavior in Perry

- config perry compiler
- modify `crates/perry/src/commands/compile/link.rs` in perry

to make the test pass.
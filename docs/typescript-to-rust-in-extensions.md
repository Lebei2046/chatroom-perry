`/home/lebei/dev/perryts/chatroom/extensions/perry-vosk/src/index.ts#L4-5` `/home/lebei/dev/perryts/chatroom/extensions/perry-vosk/crate-linux/src/lib.rs#L204-205` , look at the first parameter, why string parameter in typescript is mapped to *const StringHeader instead of NaN-boxed string?

## Good question! The difference is in how they're called:

### Native Extension vs Perry Internal Dispatch

| Function Type | Source | String Passing |
|--------------|--------|-----------------|
| `perry_system_*` | Perry internal | NaN-boxed f64 (standard ABI) |
| `vosk_*` | Native extension | Direct `*const StringHeader` (custom ABI) |

### Why the difference?

**1. `perry_system_*` functions** (like `perry_system_audio_set_output_filename`):
- Go through Perry's **standard dispatch table** (`PERRY_SYSTEM_TABLE`)
- Use standardized ABI: strings are NaN-boxed as `f64`
- The runtime extracts the pointer via `js_nanbox_get_pointer(value: f64) -> i64`

**2. `vosk_*` functions** (your extension):
- Are **native library extensions** - separate compilation unit
- Define their **own FFI interface** directly
- The caller (Perry runtime) knows to pass `*const StringHeader` because that's what you declared in the TypeScript FFI

### How Perry calls `vosk_convert_file`:

Perry's codegen generates code that knows to pass the raw `StringHeader*` pointer directly (not NaN-boxed), because the native library's interface was designed that way.

### Summary:

```
perry/system (standard):   TS → NaN-boxed f64 → runtime extracts pointer
vosk/* (extension):        TS → direct *const StringHeader → no boxing needed
```

The `vosk_*` functions bypass Perry's standard dispatch because they're loaded as a native library extension with its own calling convention.
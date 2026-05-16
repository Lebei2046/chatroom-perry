Let me check if Perry provides a built-in API for extracting strings:
          
## Yes! Perry provides exactly this functionality via `perry-ffi`.

### The `perry-ffi` crate has built-in helpers:

**`read_string`** ([perry-ffi/src/lib.rs:169-172](file:///home/lebei/dev/perryts/perry/crates/perry-ffi/src/lib.rs#L169-L172)):
```rust
pub fn read_string(handle: JsString) -> Option<&'static str> {
    let bytes = read_bytes(handle)?;
    std::str::from_utf8(bytes).ok()
}
```

**`read_bytes`** ([perry-ffi/src/lib.rs:183-195](file:///home/lebei/dev/perryts/perry/crates/perry-ffi/src/lib.rs#L183-L195)):
```rust
pub fn read_bytes(handle: JsString) -> Option<&'static [u8]> {
    if handle.is_null() { return None; }
    unsafe {
        let header = &*handle.0;
        let len = header.byte_len as usize;
        let data_ptr = (handle.0 as *const u8).add(std::mem::size_of::<StringHeader>());
        Some(std::slice::from_raw_parts(data_ptr, len))
    }
}
```

### How to use it in vosk_convert_file:

```rust
use perry_ffi::{JsString, read_string};

#[no_mangle]
pub unsafe extern "C" fn vosk_convert_file(file_path_ptr: i64, callback: f64) {
    // Wrap the pointer in JsString
    let handle = JsString::from_raw(file_path_ptr as *mut StringHeader);
    
    // Read the string (returns Option<&'static str>)
    let file_path = match read_string(handle) {
        Some(s) if !s.is_empty() && s.len() <= 1024 => s,
        _ => return,
    };
    
    let result = convert_file(file_path);
    // ... rest of function
}
```

### Benefits of using `perry-ffi`:
1. **Standardized**: Same API used by all Perry extensions
2. **Safe**: Proper null checking and UTF-8 validation
3. **Maintained**: Part of Perry's official FFI layer
4. **Type-safe**: Uses `JsString` wrapper instead of raw pointers

Your `str_from_header` implementation is functionally equivalent to what `perry-ffi::read_string` does! 🎯
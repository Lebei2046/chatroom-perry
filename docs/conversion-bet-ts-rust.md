Now I've updated the code to remove the manual constants and use the proper Perry FFI functions. Here's a summary of the changes:

**Changes Made:**

1. **Removed manual constants**:
   - `STRING_TAG: u64 = 0x7FFF_0000_0000_0000`
   - `POINTER_MASK: u64 = 0x0000_FFFF_FFFF_FFFF`

2. **Added proper Perry FFI functions**:
   ```rust
   extern "C" {
       fn js_closure_call1(closure: i64, arg: f64);
       fn js_nanbox_get_pointer(value: f64) -> i64;
       fn js_nanbox_string(ptr: i64) -> f64;
   }
   ```

3. **Updated all functions to use Perry conventions**:
   - `vosk_start` - now uses `js_nanbox_get_pointer(callback)`
   - `vosk_process_samples` - now uses `js_nanbox_get_pointer(samples_ptr_val)`
   - `send_to_js` - now uses `js_nanbox_string(str_handle.as_raw() as i64)`
   - `vosk_convert_file` - now uses `js_nanbox_get_pointer(callback)`

**Proper Perry Pattern:**
- **`js_nanbox_get_pointer(value: f64) -> i64`**: Extract a pointer from a NaN-boxed value
- **`js_nanbox_string(ptr: i64) -> f64`**: Convert a string pointer to a NaN-boxed string

This follows the standard Perry conventions and is cleaner than manual bit manipulation.
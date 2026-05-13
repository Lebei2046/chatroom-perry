## TypeScript side

The `src/index.ts` declares native functions and optionally wraps them in a friendlier API:

```typescript
// Declare the native function (name must match package.json)
declare function sb_appreview_request(): number;

// Wrap it with a proper TypeScript signature
export async function requestReview(): Promise<void> {
  await (sb_appreview_request() as any);
}
```

`declare function` tells Perry the function is provided by native code. The raw return type is `number` because all values cross the FFI boundary as NaN-boxed `f64` values. Promise handles are NaN-boxed pointers that Perry’s runtime knows how to `await`.

## Rust side

Each platform crate is a `staticlib` that implements the declared functions using `#[no_mangle] pub extern "C"`:

```rust
// Perry runtime FFI
extern "C" {
    fn js_promise_new() -> *mut u8;
    fn js_promise_resolve(promise: *mut u8, value: f64);
    fn js_nanbox_string(ptr: i64) -> f64;
    fn js_nanbox_pointer(ptr: i64) -> f64;
}

#[no_mangle]
pub extern "C" fn sb_appreview_request() -> f64 {
    unsafe {
        let promise = js_promise_new();
        // ... call platform API, resolve promise when done ...
        js_nanbox_pointer(promise as i64);
    }
}
```

Key runtime functions available to native code:

| Function | Purpose |
|----------|---------|
| `js_promise_new()` | Create a new Perry promise, returns pointer |
| `js_promise_resolve(promise, value)` | Resolve a promise with a NaN-boxed value |
| `js_nanbox_string(ptr)` | Convert a C string pointer to a NaN-boxed string |
| `js_nanbox_pointer(ptr)` | Convert a pointer to a NaN-boxed object reference |
| `js_get_string_pointer_unified(val)` | Extract string pointer from a NaN-boxed value |
| `js_string_from_bytes(ptr, len)` | Create a Perry string from bytes |


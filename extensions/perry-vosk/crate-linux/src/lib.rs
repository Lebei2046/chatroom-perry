use once_cell::sync::Lazy;
use perry_ffi::StringHeader;
use std::ffi::CString;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};


static VOSK_RUNNING: AtomicBool = AtomicBool::new(false);
static SESSION_ID: AtomicU64 = AtomicU64::new(0);
static COUNTER: AtomicU64 = AtomicU64::new(1);

const SAMPLE_RATE: u32 = 16000;

static VOSK_MODEL: Lazy<Option<vosk::Model>> = Lazy::new(|| {
    eprintln!("Vosk: Initializing model...");
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => ".".to_string(),
    };
    eprintln!("Vosk: HOME env var: {}", home);
    let model_path = std::path::PathBuf::from(home).join(".perry").join("model");
    eprintln!("Vosk: Model path: {:?}", model_path);
    eprintln!("Vosk: Model exists? {}", model_path.exists());
    
    if !model_path.exists() {
        eprintln!("Vosk: Model not found at {:?}", model_path);
        eprintln!("Vosk: Install with: bash scripts/install-vosk-model.sh");
        return None;
    }
    
    let model_path_str = model_path.to_string_lossy().to_string();
    eprintln!("Vosk: Loading model from: {}", model_path_str);
    match vosk::Model::new(model_path_str) {
        Some(m) => {
            eprintln!("Vosk: Loaded model from {}", model_path.display());
            Some(m)
        }
        None => {
            eprintln!("Vosk: Failed to load model");
            None
        }
    }
});

static RECOGNIZER: Mutex<Option<(Arc<Mutex<vosk::Recognizer>>, i64)>> = Mutex::new(None);

fn downsample(samples: &[f32], source_rate: u32, target_rate: u32) -> Vec<f32> {
    if source_rate == target_rate {
        return samples.to_vec();
    }
    let ratio = source_rate as f64 / target_rate as f64;
    let target_len = (samples.len() as f64 / ratio) as usize;
    let mut result = Vec::with_capacity(target_len);
    
    for i in 0..target_len {
        let src_idx = (i as f64 * ratio) as usize;
        result.push(samples[src_idx.min(samples.len() - 1)]);
    }
    result
}

fn to_pcm_i16(samples: &[f32]) -> Vec<i16> {
    samples
        .iter()
        .map(|&f| (f * i16::MAX as f32) as i16)
        .collect()
}

extern "C" {
    fn js_closure_call1(closure: i64, arg: i64);
    fn js_string_from_bytes(ptr: *const u8, len: i32) -> i64;
}

fn send_to_js(closure: i64, text: &str) {
    unsafe {
        let c_str = match CString::new(text) {
            Ok(s) => s,
            Err(_) => return,
        };
        let js_str = js_string_from_bytes(c_str.as_ptr() as *const u8, text.len() as i32);
        js_closure_call1(closure, js_str);
    }
}

#[no_mangle]
pub unsafe extern "C" fn voskIsAvailable() -> f64 {
    eprintln!("[VOSK DEBUG] js_voskIsAvailable() called");
    if VOSK_MODEL.is_some() {
        eprintln!("[VOSK DEBUG] returning 1.0");
        1.0
    } else {
        eprintln!("[VOSK DEBUG] returning 0.0");
        0.0
    }
}

#[no_mangle]
pub unsafe extern "C" fn voskStart(callback: i64) -> i64 {
    eprintln!("[VOSK DEBUG] voskStart() called");
    eprintln!("[VOSK DEBUG] Callback handle: {}", callback);
    if VOSK_RUNNING.load(Ordering::Relaxed) {
        eprintln!("[VOSK DEBUG] Already running");
        return SESSION_ID.load(Ordering::Relaxed) as i64;
    }

    let Some(model) = VOSK_MODEL.as_ref() else {
        eprintln!("[VOSK DEBUG] No model available");
        return 0;
    };

    let Some(rec) = vosk::Recognizer::new(model, SAMPLE_RATE as f32) else {
        eprintln!("[VOSK DEBUG] Failed to create recognizer");
        return 0;
    };

    let session_id = COUNTER.fetch_add(1, Ordering::Relaxed);
    SESSION_ID.store(session_id, Ordering::Relaxed);
    VOSK_RUNNING.store(true, Ordering::Relaxed);

    let rec_arc = Arc::new(Mutex::new(rec));
    *RECOGNIZER.lock().unwrap() = Some((rec_arc, callback));

    eprintln!("[VOSK DEBUG] Recognition started, session: {}", session_id);

    session_id as i64
}

#[no_mangle]
pub unsafe extern "C" fn voskProcessSamples(samples_ptr: *const f32, num_samples: usize) {
    if !VOSK_RUNNING.load(Ordering::Relaxed) {
        return;
    }

    let Some((rec, callback)) = RECOGNIZER.lock().unwrap().clone() else {
        return;
    };

    let samples = std::slice::from_raw_parts(samples_ptr, num_samples);
    if samples.is_empty() {
        return;
    }

    let downsampled = downsample(samples, 48000, SAMPLE_RATE);
    let pcm_samples = to_pcm_i16(&downsampled);

    let mut rec_lock = rec.lock().unwrap();
    let _ = rec_lock.accept_waveform(&pcm_samples);

    static LAST_TEXT: Mutex<String> = Mutex::new(String::new());
    let result = rec_lock.partial_result();
    let trimmed = result.partial.trim();
    
    let mut last_text = LAST_TEXT.lock().unwrap();
    if !trimmed.is_empty() && trimmed != *last_text {
        *last_text = trimmed.to_string();
        send_to_js(callback, &last_text);
    }
}

#[no_mangle]
pub unsafe extern "C" fn voskStop(session_id: i64) {
    eprintln!("[VOSK DEBUG] js_voskStop() called for session {}", session_id);
    if !VOSK_RUNNING.load(Ordering::Relaxed) {
        return;
    }

    VOSK_RUNNING.store(false, Ordering::Relaxed);
    
    if let Some((rec, callback)) = RECOGNIZER.lock().unwrap().take() {
        let mut rec_lock = rec.lock().unwrap();
        let final_result = rec_lock.final_result();
        match final_result {
            vosk::CompleteResult::Single(res) => {
                let trimmed = res.text.trim();
                if !trimmed.is_empty() {
                    send_to_js(callback, trimmed);
                }
            }
            vosk::CompleteResult::Multiple(_) => {}
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn voskConvertFile(file_path_value: f64, callback: i64) {
    eprintln!("Vosk: voskConvertFile called with file_path_value: {} (0x{:x})", file_path_value, file_path_value.to_bits());
    
    const POINTER_MASK: u64 = 0x0000_FFFF_FFFF_FFFF;
    let bits = file_path_value.to_bits();
    let ptr = (bits & POINTER_MASK) as usize;
    
    if ptr < 0x1000 {
        eprintln!("Vosk: Invalid pointer");
        return;
    }
    
    let file_path_ptr = ptr as *const StringHeader;
    let len = (*file_path_ptr).byte_len as usize;
    eprintln!("Vosk: String byte length: {}", len);
    
    if len == 0 || len > 1024 {
        eprintln!("Vosk: Invalid string length: {}", len);
        return;
    }
    
    let data_ptr = (file_path_ptr as *const u8).add(std::mem::size_of::<StringHeader>());
    let bytes = std::slice::from_raw_parts(data_ptr, len);
    
    let file_path = String::from_utf8_lossy(bytes).into_owned();
    eprintln!("Vosk: voskConvertFile called with path: {}", file_path);
    eprintln!("Vosk: Callback handle: {} (0x{:x})", callback, callback as u64);
    
    let result = convert_file(&file_path);
    eprintln!("Vosk: Conversion result: '{}'", result);
    if callback != 0 {
        eprintln!("Vosk: Calling callback with handle: {}", callback);
        send_to_js(callback, &result);
        eprintln!("Vosk: Callback called successfully");
    } else {
        eprintln!("Vosk: No callback provided");
    }
}

pub fn convert_file(file_path: &str) -> String {
    let Some(model) = VOSK_MODEL.as_ref() else {
        return "Vosk model not loaded".to_string();
    };

    let Some(mut rec) = vosk::Recognizer::new(model, SAMPLE_RATE as f32) else {
        return "Failed to create recognizer".to_string();
    };

    let file = match std::fs::File::open(file_path) {
        Ok(f) => f,
        Err(e) => return format!("Failed to open file: {}", e),
    };

    let mut reader = match hound::WavReader::new(file) {
        Ok(r) => r,
        Err(_) => return "Invalid WAV file".to_string(),
    };

    let source_rate = reader.spec().sample_rate;
    let mut samples: Vec<f32> = Vec::new();

    for sample in reader.samples::<i16>() {
        if let Ok(s) = sample {
            samples.push(s as f32 / i16::MAX as f32);
        }
    }

    let downsampled = if source_rate != SAMPLE_RATE {
        downsample(&samples, source_rate, SAMPLE_RATE)
    } else {
        samples
    };

    let pcm_samples = to_pcm_i16(&downsampled);
    let _ = rec.accept_waveform(&pcm_samples);
    
    let result = rec.final_result();
    match result {
        vosk::CompleteResult::Single(res) => {
            let trimmed = res.text.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
        vosk::CompleteResult::Multiple(_) => {}
    }
    "No speech detected".to_string()
}
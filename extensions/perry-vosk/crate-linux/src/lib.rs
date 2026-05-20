use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Instant, Duration};

#[repr(C)]
struct StringHeader {
    utf16_len: u32,
    byte_len: u32,
    capacity: u32,
    refcount: u32,
    flags: u32,
}

unsafe fn read_string(ptr: *mut StringHeader) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    let header = &*ptr;
    let data_ptr = (ptr as *mut u8).add(std::mem::size_of::<StringHeader>());
    let bytes = std::slice::from_raw_parts(data_ptr, header.byte_len as usize);
    std::str::from_utf8(bytes).ok().map(String::from)
}

struct PendingRecognition {
    callback: i64,
    text: String,
}

unsafe impl Send for PendingRecognition {}

static PENDING_RECOGNITIONS: Mutex<Vec<PendingRecognition>> = Mutex::new(Vec::new());

extern "C" {
    fn js_notify_main_thread();
    fn js_register_ext_pump(f: extern "C" fn() -> i32);
}

static VOSK_RUNNING: AtomicBool = AtomicBool::new(false);
static SESSION_ID: AtomicU64 = AtomicU64::new(0);
static COUNTER: AtomicU64 = AtomicU64::new(1);

const SAMPLE_RATE: u32 = 16000;

const SILENCE_THRESHOLD: f32 = 0.01;
const SILENCE_DURATION_THRESHOLD: Duration = Duration::from_millis(500);
static LAST_SPEECH_TIME: Mutex<Option<Instant>> = Mutex::new(None);
static IS_SPEAKING: AtomicBool = AtomicBool::new(false);

static VOSK_MODEL: Lazy<Option<vosk::Model>> = Lazy::new(|| {
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => ".".to_string(),
    };
    let model_path = std::path::PathBuf::from(home).join(".perry").join("model");

    if !model_path.exists() {
        eprintln!("Vosk: Model not found at {:?}. Install with: bash scripts/install-vosk-model.sh", model_path);
        return None;
    }

    let model_path_str = model_path.to_string_lossy().to_string();
    match vosk::Model::new(model_path_str) {
        Some(m) => Some(m),
        None => None,
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
    fn js_closure_call1(closure: i64, arg: f64);
    fn js_nanbox_get_pointer(value: f64) -> i64;
    fn js_nanbox_string(ptr: i64) -> f64;
    fn js_string_from_bytes(data: *const u8, len: u32) -> *mut StringHeader;
}

fn send_to_js(closure: i64, text: &str) {
    {
        let mut pending = PENDING_RECOGNITIONS.lock().unwrap();
        pending.push(PendingRecognition {
            callback: closure,
            text: text.to_string(),
        });
    }
    
    unsafe {
        js_notify_main_thread();
    }
}

#[no_mangle]
pub unsafe extern "C" fn vosk_is_available() -> f64 {
    if VOSK_MODEL.is_some() { 1.0 } else { 0.0 }
}

static PUMP_REGISTERED: AtomicBool = AtomicBool::new(false);

#[no_mangle]
pub unsafe extern "C" fn vosk_start(callback: f64) -> i64 {
    let callback_ptr = js_nanbox_get_pointer(callback);

    if VOSK_RUNNING.load(Ordering::Relaxed) {
        return SESSION_ID.load(Ordering::Relaxed) as i64;
    }

    let Some(model) = VOSK_MODEL.as_ref() else {
        return 0;
    };

    let Some(rec) = vosk::Recognizer::new(model, SAMPLE_RATE as f32) else {
        return 0;
    };

    let session_id = COUNTER.fetch_add(1, Ordering::Relaxed);
    SESSION_ID.store(session_id, Ordering::Relaxed);
    VOSK_RUNNING.store(true, Ordering::Relaxed);

    let rec_arc = Arc::new(Mutex::new(rec));
    *RECOGNIZER.lock().unwrap() = Some((rec_arc, callback_ptr));

    if !PUMP_REGISTERED.load(Ordering::Relaxed) {
        js_register_ext_pump(vosk_process_pending);
        PUMP_REGISTERED.store(true, Ordering::Relaxed);
    }

    session_id as i64
}

fn detect_speech(samples: &[f32]) -> bool {
    let mut sum_sq = 0.0f64;
    for &sample in samples {
        sum_sq += (sample as f64) * (sample as f64);
    }
    let rms = (sum_sq / samples.len() as f64).sqrt() as f32;
    rms > SILENCE_THRESHOLD
}

static LAST_UPDATE_TIME: AtomicU64 = AtomicU64::new(0);
const UPDATE_INTERVAL_MS: u64 = 50;
static LAST_TEXT: Mutex<String> = Mutex::new(String::new());

#[no_mangle]
pub unsafe extern "C" fn vosk_process_samples(samples_ptr_val: f64, num_samples: f64) {
    let samples_ptr = js_nanbox_get_pointer(samples_ptr_val) as *const f32;
    let num_samples_usize = num_samples as usize;

    if !VOSK_RUNNING.load(Ordering::Relaxed) {
        return;
    }

    let Some((rec, callback)) = RECOGNIZER.lock().unwrap().clone() else {
        return;
    };

    let samples = std::slice::from_raw_parts(samples_ptr, num_samples_usize);
    if samples.is_empty() {
        return;
    }

    let downsampled = downsample(samples, 48000, SAMPLE_RATE);
    let pcm_samples = to_pcm_i16(&downsampled);

    let mut rec_lock = rec.lock().unwrap();
    let _ = rec_lock.accept_waveform(&pcm_samples);

    let result = rec_lock.partial_result();
    let trimmed = result.partial.trim();

    if !trimmed.is_empty() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let last = LAST_UPDATE_TIME.load(Ordering::Relaxed);
        let mut last_text = LAST_TEXT.lock().unwrap();
        
        let text_changed = *last_text != trimmed;
        *last_text = trimmed.to_string();
        
        if text_changed || now - last >= UPDATE_INTERVAL_MS {
            LAST_UPDATE_TIME.store(now, Ordering::Relaxed);
            send_to_js(callback, trimmed);
        }
    }
}

#[no_mangle]
pub extern "C" fn vosk_process_pending() -> i32 {
    let mut pending = PENDING_RECOGNITIONS.lock().unwrap();
    
    for item in pending.drain(..) {
        unsafe {
            let str_ptr = js_string_from_bytes(item.text.as_ptr(), item.text.len() as u32);
            let js_val = js_nanbox_string(str_ptr as i64);
            js_closure_call1(item.callback, js_val);
        }
    }
    
    pending.len() as i32
}

#[no_mangle]
pub unsafe extern "C" fn vosk_stop(_session_id: i64) {
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
pub unsafe extern "C" fn vosk_convert_file(file_path_ptr: i64, callback: f64) {
    let file_path = read_string(file_path_ptr as *mut StringHeader).unwrap_or_default();

    if file_path.is_empty() || file_path.len() > 1024 {
        return;
    }

    let result = convert_file(&file_path);

    let callback_ptr = js_nanbox_get_pointer(callback);

    if callback_ptr != 0 {
        send_to_js(callback_ptr, &result);
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
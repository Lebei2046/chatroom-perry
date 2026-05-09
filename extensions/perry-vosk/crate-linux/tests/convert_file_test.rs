use perry_vosk::convert_file;
use std::path::PathBuf;

#[test]
fn test_convert_file() {
    let wav_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests").join("voice.wav");
    
    assert!(wav_path.exists(), "WAV file not found at: {}", wav_path.display());
    
    let wav_path_str = wav_path.to_string_lossy().to_string();
    println!("Testing convert_file with: {}", wav_path_str);
    
    let result = convert_file(&wav_path_str);
    println!("Conversion result: '{}'", result);
    
    assert_ne!(result, "Vosk model not loaded", "Vosk model should be loaded");
    assert_ne!(result, "Failed to create recognizer", "Recognizer should be created");
    assert!(!result.starts_with("Failed to open file:"), "File should be readable");
    assert_ne!(result, "Invalid WAV file", "WAV file should be valid");
    
    println!("Test passed!");
}
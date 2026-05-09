use perry_vosk::convert_file;

#[test]
fn test_convert_file_invalid_path() {
    let result = convert_file("/nonexistent/path/to/audio.wav");
    assert!(result.starts_with("Failed to open file:"), 
            "Expected 'Failed to open file:', got '{}'", result);
    println!("✓ Invalid path returns appropriate error");
}

#[test]
fn test_convert_file_empty_string() {
    let result = convert_file("");
    assert!(result.starts_with("Failed to open file:"),
            "Expected 'Failed to open file:', got '{}'", result);
    println!("✓ Empty path returns appropriate error");
}

#[test]
fn test_convert_file_invalid_wav() {
    let result = convert_file("/etc/hosts");
    assert_eq!(result, "Invalid WAV file",
               "Expected 'Invalid WAV file', got '{}'", result);
    println!("✓ Non-WAV file returns appropriate error");
}
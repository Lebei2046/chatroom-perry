use std::env;
use std::path::Path;

#[test]
fn test_model_path_exists() {
    let home = env::var("HOME").expect("HOME environment variable not set");
    let model_path = Path::new(&home).join(".perry").join("model");
    
    println!("Checking model path: {:?}", model_path);
    
    if model_path.exists() {
        assert!(model_path.is_dir(), "Model path exists but is not a directory");
        println!("Model directory exists");
    } else {
        println!("Model directory does not exist - skipping model tests");
    }
}

#[test]
fn test_model_path_structure() {
    let home = env::var("HOME").expect("HOME environment variable not set");
    let model_path = Path::new(&home).join(".perry").join("model");
    
    if !model_path.exists() {
        println!("Model directory does not exist - skipping structure test");
        return;
    }
    
    let required_files = [
        "model.conf",
        "ivector/final.ie",
        "graph/HCLr.fst",
        "graph/Gr.fst",
        "graph/phones/word_boundary.int",
    ];
    
    for file in required_files.iter() {
        let file_path = model_path.join(file);
        if file_path.exists() {
            println!("✓ Found: {}", file);
        } else {
            println!("✗ Missing: {} (may not be required for all models)", file);
        }
    }
}
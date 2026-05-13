use std::env;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-env-changed=VOSK_LIB_DIR");
    println!("cargo:rerun-if-env-changed=LD_LIBRARY_PATH");
    
    let lib_dirs = vec![
        "/usr/local/lib",
        "/usr/lib",
        "/usr/lib/x86_64-linux-gnu",
        "/opt/vosk/lib",
    ];
    
    let mut found = false;
    
    if let Ok(vosk_lib_dir) = env::var("VOSK_LIB_DIR") {
        if Path::new(&vosk_lib_dir).exists() {
            println!("cargo:rustc-link-search=native={}", vosk_lib_dir);
            found = true;
        }
    }
    
    if !found {
        for dir in lib_dirs {
            let lib_path = Path::new(dir).join("libvosk.so");
            if lib_path.exists() {
                println!("cargo:rustc-link-search=native={}", dir);
                found = true;
                break;
            }
        }
    }
    
    if !found {
        println!("cargo:warning=libvosk.so not found in standard locations. Consider setting VOSK_LIB_DIR environment variable.");
    }
    
    println!("cargo:rustc-link-lib=vosk");
}
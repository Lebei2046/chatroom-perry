use std::env;
use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rustc-link-search=native=/usr/local/lib");
    println!("cargo:rustc-link-lib=dylib=vosk");

    let out_dir = env::var("OUT_DIR").unwrap();
    let target_dir = Path::new(&out_dir).parent().unwrap().parent().unwrap().parent().unwrap();

    let target_triple = env::var("TARGET").unwrap();
    let triple_release_dir = target_dir.join(&target_triple).join("release");
    let src_lib = triple_release_dir.join("libperry_vosk.a");

    let release_dir = target_dir.join("release");
    let dest_lib = release_dir.join("libperry_vosk.a");

    if src_lib.exists() {
        let _ = fs::create_dir_all(&release_dir);
        match fs::copy(&src_lib, &dest_lib) {
            Ok(_) => {
                println!("cargo:warning=Copied libperry_vosk.a from {} to target/release", target_triple);
            }
            Err(e) => {
                eprintln!("Warning: Failed to copy libperry_vosk.a: {}", e);
            }
        }
    }
}
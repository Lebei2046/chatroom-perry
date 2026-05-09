import { voskConvertFile, voskIsAvailable } from "perry-vosk";

function runTest() {
    console.log("Testing voskConvertFile in perry-vosk package...");
    
    const available = voskIsAvailable();
    console.log("Vosk available:", available);
    
    if (available === 0) {
        console.error("FAIL: Vosk is not available");
        return;
    }
    
    const testCases = [
        { path: "./extensions/perry-vosk/crate-linux/tests/voice.wav", description: "Valid WAV file" }
    ];
    
    let testCompleted = false;
    
    voskConvertFile(testCases[0].path, (result: string) => {
        console.log("\n=== Conversion Result ===");
        console.log("Result:", result);
        console.log("=========================\n");
        
        if (result === "Vosk model not loaded") {
            console.error("FAIL: Model not loaded");
        } else if (result.startsWith("Failed to open file:")) {
            console.error("FAIL: Cannot open file");
        } else if (result === "Invalid WAV file") {
            console.error("FAIL: Invalid WAV file");
        } else if (result === "No speech detected") {
            console.warn("WARNING: No speech detected in audio");
        } else {
            console.log("SUCCESS: Voice-to-text conversion works!");
            console.log(`Recognized text: "${result}"`);
        }
        
        testCompleted = true;
    });
    
    // Wait for callback to complete
    let waitCount = 0;
    const checkInterval = setInterval(() => {
        if (testCompleted || waitCount > 50) {
            clearInterval(checkInterval);
            if (!testCompleted) {
                console.error("FAIL: Timeout waiting for conversion result");
            }
        }
        waitCount++;
    }, 100);
}

runTest();
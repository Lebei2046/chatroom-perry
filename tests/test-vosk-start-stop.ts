import { voskIsAvailable, voskStart, voskStop } from "perry-vosk";

function runTest() {
    console.log("=== Testing voskStart and voskStop ===");
    
    const isAvailable = voskIsAvailable();
    console.log("Vosk available:", isAvailable);
    
    if (isAvailable !== 1) {
        console.log("Vosk not available, skipping start/stop tests");
        return;
    }
    
    console.log("\nTest 1: voskStart with callback");
    
    const callback = (result: string) => {
        console.log("Transcription callback received:", result);
    };
    
    const sessionId = voskStart(callback);
    console.log("voskStart returned session ID:", sessionId);
    
    if (sessionId > 0) {
        console.log("✓ voskStart succeeded");
    } else {
        console.log("✗ voskStart failed");
        return;
    }
    
    console.log("\nTest 2: voskStop with valid session ID");
    
    voskStop(sessionId);
    console.log("✓ voskStop called successfully");
    
    console.log("\nTest 3: voskStop with invalid session ID");
    
    voskStop(9999);
    console.log("✓ voskStop handled invalid session gracefully");
}

runTest();
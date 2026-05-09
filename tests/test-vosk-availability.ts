import { voskIsAvailable } from "perry-vosk";

function runTest() {
    console.log("=== Testing voskIsAvailable ===");
    
    const isAvailable = voskIsAvailable();
    console.log("voskIsAvailable returned:", isAvailable);
    
    if (isAvailable === 1) {
        console.log("✓ Vosk is available");
    } else if (isAvailable === 0) {
        console.log("✗ Vosk is not available");
    } else {
        console.log("? Unexpected return value:", isAvailable);
    }
}

runTest();
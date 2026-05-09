import { App, VStack, Text } from "perry/ui";
import { voskConvertFile, voskIsAvailable } from "perry-vosk";

function runTest() {
    console.log("=== Testing voskConvertFile Edge Cases ===");
    
    const available = voskIsAvailable();
    if (available === 0) {
        console.error("SKIP: Vosk is not available");
        return;
    }
    
    const testCases = [
        { path: "./extensions/perry-vosk/crate-linux/tests/voice.wav", description: "Valid WAV file" },
        { path: "./nonexistent/file.wav", description: "Non-existent file" },
        { path: "./extensions/perry-vosk/package.json", description: "Non-WAV file (JSON)" },
        { path: "", description: "Empty string path" },
        { path: "./extensions/perry-vosk/crate-linux/tests/", description: "Directory path" }
    ];
    
    let testIndex = 0;
    
    function runNextTest() {
        if (testIndex >= testCases.length) {
            console.log("=== All Edge Case Tests Complete ===");
            return;
        }
        
        const testCase = testCases[testIndex];
        console.log(`\nTest ${testIndex + 1}: ${testCase.description}`);
        console.log(`Path: "${testCase.path}"`);
        
        voskConvertFile(testCase.path, (result: string) => {
            console.log(`Result: "${result}"`);
            
            if (testCase.path === "./extensions/perry-vosk/crate-linux/tests/voice.wav") {
                if (result && result !== "No speech detected" && !result.startsWith("Failed")) {
                    console.log("  PASS: Valid file processed");
                } else {
                    console.log("  WARNING: Valid file but no result or error");
                }
            } else if (testCase.path === "./nonexistent/file.wav") {
                if (result.startsWith("Failed to open file")) {
                    console.log("  PASS: Correctly handled non-existent file");
                } else {
                    console.log("  FAIL: Expected 'Failed to open file' error");
                }
            } else if (testCase.path === "./extensions/perry-vosk/package.json") {
                if (result === "Invalid WAV file") {
                    console.log("  PASS: Correctly handled non-WAV file");
                } else {
                    console.log("  FAIL: Expected 'Invalid WAV file' error");
                }
            } else if (testCase.path === "") {
                if (result.startsWith("Failed to open file") || result === "Invalid WAV file") {
                    console.log("  PASS: Correctly handled empty path");
                } else {
                    console.log("  FAIL: Expected error for empty path");
                }
            }
            
            testIndex++;
            runNextTest();
        });
    }
    
    runNextTest();
}

App({
    title: "Vosk Convert Edge Cases",
    width: 400,
    height: 200,
    body: VStack([
        Text("Testing Vosk Convert Edge Cases")
    ])
});

runTest();
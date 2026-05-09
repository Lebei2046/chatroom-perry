import { voskIsAvailable, voskConvertFile } from "perry-vosk";

function runTest() {
    console.log("=== Testing Basic String Handling ===");
    
    const isAvailable = voskIsAvailable();
    console.log("Vosk available:", isAvailable);
    
    if (isAvailable === 1) {
        console.log("\nTesting voskConvertFile with simple string...");
        
        const testPath = "./test.wav";
        console.log("Path to convert:", testPath);
        
        voskConvertFile(testPath, (result: string) => {
            console.log("Conversion result callback:", result);
        });
        
        console.log("voskConvertFile called");
    } else {
        console.log("Vosk not available, skipping...");
    }
}

runTest();
// Declare the native functions exactly as they appear in package.json and Rust
declare function voskIsAvailable(): number;
declare function voskStart(onResult: (text: string) => void): number;
declare function voskStop(sessionId: number): void;
declare function voskConvertFile(filePath: string, onResult: (text: string) => void): void;
declare function voskProcessSamples(samplesPtr: any, numSamples: number): void;

export { voskIsAvailable, voskStart, voskStop, voskConvertFile, voskProcessSamples };

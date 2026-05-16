declare function vosk_is_available(): number;
declare function vosk_start(onResult: (text: string) => void): number;
declare function vosk_stop(sessionId: number): void;
declare function vosk_convert_file(filePath: string, onResult: (text: string) => void): void;
declare function vosk_process_samples(samplesPtr: any, numSamples: number): void;
declare function vosk_process_pending(): number;

export function voskIsAvailable(): number {
    return vosk_is_available();
}

export function voskStart(onResult: (text: string) => void): number {
    return vosk_start(onResult);
}

export function voskStop(sessionId: number): void {
    vosk_stop(sessionId);
}

export function voskConvertFile(filePath: string, onResult: (text: string) => void): void {
    vosk_convert_file(filePath, onResult);
}

export function voskProcessSamples(samplesPtr: any, numSamples: number): void {
    vosk_process_samples(samplesPtr, numSamples);
}

export function voskProcessPending(): number {
    return vosk_process_pending();
}
import { Button, widgetSetWidth, widgetSetHeight, setCornerRadius, widgetSetBackgroundColor, widgetSetOnClick } from "perry/ui";
import { audioStart, audioStop, audioRegisterCallback, audioUnregisterCallback } from "perry/system";
import { voskIsAvailable, voskStart, voskStop, voskProcessSamples } from "perry-vosk";

interface SpeechRecognizerOptions {
    onTextRecognized?: (text: string) => void;
    onStatusChange?: (isActive: boolean) => void;
}

export class SpeechRecognizer {
    private button: Widget;
    private isActive = false;
    private sessionId = 0;
    private voskAvailable: number | null = null;

    private onTextRecognizedCallback?: (text: string) => void;
    private onStatusChangeCallback?: (isActive: boolean) => void;

    constructor(options?: SpeechRecognizerOptions) {
        this.onTextRecognizedCallback = options?.onTextRecognized;
        this.onStatusChangeCallback = options?.onStatusChange;
        this.button = this.buildButton();
    }

    private checkAvailability(): number {
        if (this.voskAvailable !== null) {
            console.log("[SpeechRecognizer] Returning cached voskAvailable:", this.voskAvailable);
            return this.voskAvailable;
        }

        console.log("[SpeechRecognizer] Checking vosk availability directly");
        try {
            this.voskAvailable = voskIsAvailable();
            console.log("[SpeechRecognizer] voskIsAvailable returned:", this.voskAvailable);
            return this.voskAvailable;
        } catch (e) {
            console.log("[SpeechRecognizer] Error calling voskIsAvailable:", e);
        }

        console.log("[SpeechRecognizer] Checking Web Speech API");
        const hasWebSpeech = typeof window !== 'undefined' &&
            (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);
        console.log("[SpeechRecognizer] hasWebSpeech:", hasWebSpeech);
        
        if (hasWebSpeech) {
            this.voskAvailable = 1;
            return 1;
        }

        console.log("[SpeechRecognizer] No speech recognition available");
        this.voskAvailable = 0;
        return 0;
    }

    private async startSpeechRecognition(): Promise<boolean> {
        console.log("[SpeechRecognizer] startSpeechRecognition called");
        
        const available = this.checkAvailability();
        console.log("[SpeechRecognizer] checkAvailability returned:", available);
        
        if (available !== 1) {
            console.log("[SpeechRecognizer] Speech not available, returning false");
            return false;
        }

        console.log("[SpeechRecognizer] Calling voskStart");
        
        this.sessionId = voskStart((text: string) => {
            console.log("[SpeechRecognizer] vosk callback received:", text);
            if (this.onTextRecognizedCallback) {
                this.onTextRecognizedCallback(text);
            }
        });

        console.log("[SpeechRecognizer] voskStart returned sessionId:", this.sessionId);
        
        if (this.sessionId > 0) {
            console.log("[SpeechRecognizer] Session started, registering audio callback");
            audioRegisterCallback((samplesPtr: any, numSamples: number) => {
                voskProcessSamples(samplesPtr, numSamples);
            });
            console.log("[SpeechRecognizer] Starting audio");
            audioStart();
            console.log("[SpeechRecognizer] Returning true");
            return true;
        }
        console.log("[SpeechRecognizer] Session ID is 0, returning false");
        return false;
    }

    private stopSpeechRecognition(): void {
        console.log("[SpeechRecognizer] stopSpeechRecognition called, sessionId:", this.sessionId);
        audioStop();
        audioUnregisterCallback();
        voskStop(this.sessionId);
        this.sessionId = 0;
        console.log("[SpeechRecognizer] stopSpeechRecognition completed");
    }

    private handleToggle = async (): Promise<void> => {
        if (this.isActive) {
            this.stopSpeechRecognition();
            this.isActive = false;
            widgetSetBackgroundColor(this.button, 1.0, 1.0, 1.0, 1.0);
        } else {
            const started = await this.startSpeechRecognition();
            if (started) {
                this.isActive = true;
                widgetSetBackgroundColor(this.button, 0.2, 0.8, 0.2, 1.0);
            }
        }

        if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(this.isActive);
        }
    }

    private buildButton(): Widget {
        const button = Button("🔊", this.handleToggle);
        widgetSetWidth(button, 32);
        widgetSetHeight(button, 32);
        setCornerRadius(button, 16);
        widgetSetBackgroundColor(button, 1.0, 1.0, 1.0, 1.0);
        return button;
    }

    getWidget(): Widget {
        return this.button;
    }

    isSpeechActive(): boolean {
        return this.isActive;
    }

    stop(): void {
        if (this.isActive) {
            this.handleToggle();
        }
    }

    getSessionId(): number {
        return this.sessionId;
    }
}
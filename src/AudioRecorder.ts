import {
    VStack, HStack, Text, Button, VStackWithInsets,
    widgetAddChild, widgetSetBackgroundColor, widgetSetHeight, widgetSetWidth,
    setPadding, setCornerRadius, widgetSetHidden, textSetString, appSetTimer
} from "perry/ui";
import { audioStart, audioStop, audioGetLevel, audioSetOutputFilename, audioStartRecording, audioStopRecording } from "perry/system";

export interface AudioRecorderOptions {
    onSend?: (duration: number, filePath?: string) => void;
    onCancel?: () => void;
    onConvert?: (filePath?: string) => void;
}

export class AudioRecorder {
    private isRecording = false;
    private recordingStartTime = 0;
    private recordedDuration = 0;
    private isStopping = false;

    private container: Widget;
    private indicatorBubble: Widget;
    private waveformText: Widget;
    private timeIndicator: Widget;
    private cancelButton: Widget;
    private convertButton: Widget;
    private releaseHint: Widget;

    private onSendCallback?: (duration: number, filePath?: string) => void;
    private onCancelCallback?: () => void;
    private onConvertCallback?: () => void;

    private recordedLevels: number[] = [];
    private currentFileName: string = "";

    constructor(options?: AudioRecorderOptions) {
        this.onSendCallback = options?.onSend;
        this.onCancelCallback = options?.onCancel;
        this.onConvertCallback = options?.onConvert;
        this.container = this.buildUI();
    }

    private buildUI(): Widget {
        this.indicatorBubble = VStackWithInsets(12, 20, 12, 20, 16);
        widgetSetBackgroundColor(this.indicatorBubble, 0.6, 1.0, 0.6, 1.0);
        setCornerRadius(this.indicatorBubble, 16);

        const statusRow = HStack(8);
        const recordingDot = Text("🔴");
        widgetAddChild(statusRow, recordingDot);

        this.timeIndicator = Text("00:00");
        widgetAddChild(statusRow, this.timeIndicator);

        widgetAddChild(this.indicatorBubble, statusRow);

        this.waveformText = Text("..................");
        widgetAddChild(this.indicatorBubble, this.waveformText);

        this.cancelButton = Button("Cancel", () => {
            this.cancel();
        });
        widgetSetWidth(this.cancelButton, 100);
        widgetSetHeight(this.cancelButton, 44);
        setCornerRadius(this.cancelButton, 22);
        widgetSetBackgroundColor(this.cancelButton, 0.9, 0.9, 0.95, 1.0);
        widgetSetHidden(this.cancelButton, 1);

        this.convertButton = Button("Slide here to convert", () => {
            this.convert();
        });
        widgetSetWidth(this.convertButton, 140);
        widgetSetHeight(this.convertButton, 44);
        setCornerRadius(this.convertButton, 22);
        widgetSetBackgroundColor(this.convertButton, 0.9, 0.7, 0.7, 1.0);
        widgetSetHidden(this.convertButton, 1);

        this.releaseHint = Text("Release to send");

        const buttonRow = HStack(8, [
            this.cancelButton,
            this.convertButton
        ]);

        const container = VStackWithInsets(16, 16, 16, 16, 16);
        widgetSetBackgroundColor(container, 1.0, 1.0, 1.0, 1.0);
        widgetSetHidden(container, 1);

        widgetAddChild(container, this.indicatorBubble);
        widgetAddChild(container, buttonRow);
        widgetAddChild(container, this.releaseHint);

        return container;
    }

    private updateDisplay(): void {
        if (!this.isRecording || this.isStopping) return;

        const level = audioGetLevel();
        
        // AudioGetLevel returns dB with +110 offset (0-140 dB range)
        // Convert to 0-1 scale where 50 = silence threshold, 140 = max
        let normalizedLevel = 0;
        if (level >= 50 && level <= 140) {
            normalizedLevel = (level - 50) / 90;
        } else if (level > 140) {
            normalizedLevel = 1;
        } else if (level > 0) {
            normalizedLevel = level / 50;
        }
        
        const count = Math.max(3, Math.floor(normalizedLevel * 15));
        const waveform = "█".repeat(count) + " ".repeat(15 - count);

        textSetString(this.waveformText, waveform);

        this.recordedDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mins = Math.floor(this.recordedDuration / 60);
        const secs = this.recordedDuration % 60;
        textSetString(this.timeIndicator, `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

        this.recordedLevels.push(level);
    }

    start(): void {
        if (this.isRecording) return;

        const timestamp = Date.now();
        const safeTimestamp = typeof timestamp === 'number' && !isNaN(timestamp) ? timestamp : Date.now();
        const fileName = `voice_${safeTimestamp}.wav`;
        audioSetOutputFilename(fileName);
        audioStart();
        audioStartRecording();

        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.recordedDuration = 0;
        this.recordedLevels = [];
        this.currentFileName = fileName;

        widgetSetHidden(this.container, 0);
        widgetSetHidden(this.cancelButton, 0);
        widgetSetHidden(this.convertButton, 0);
        widgetSetBackgroundColor(this.indicatorBubble, 0.8, 0.2, 0.2, 1.0);

        textSetString(this.waveformText, "███████████████");
        textSetString(this.timeIndicator, "00:00");

        const self = this;
        appSetTimer(100, function() {
            self.updateDisplay();
        });
    }

    stop(): void {
        if (!this.isRecording) return;

        this.isStopping = true;
        this.isRecording = false;
        audioStopRecording();
        audioStop();

        widgetSetHidden(this.container, 1);
        widgetSetHidden(this.cancelButton, 1);
        widgetSetHidden(this.convertButton, 1);

        this.recordedDuration = Math.max(1, Math.floor((Date.now() - this.recordingStartTime) / 1000));

        if (this.onSendCallback) {
            this.onSendCallback(this.recordedDuration, this.currentFileName);
        }
        
        this.currentFileName = "";
    }

    cancel(): void {
        if (!this.isRecording) return;

        this.isStopping = true;
        this.isRecording = false;
        audioStopRecording();
        audioStop();

        widgetSetHidden(this.container, 1);
        widgetSetHidden(this.cancelButton, 1);
        widgetSetHidden(this.convertButton, 1);

        this.recordedLevels = [];
        this.currentFileName = "";

        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
    }

    convert(): void {
        if (!this.isRecording) return;

        this.isStopping = true;
        this.isRecording = false;
        audioStopRecording();
        audioStop();

        widgetSetHidden(this.container, 1);
        widgetSetHidden(this.cancelButton, 1);
        widgetSetHidden(this.convertButton, 1);

        this.recordedLevels = [];

        const isValidFilePath = this.currentFileName && 
                               typeof this.currentFileName === 'string' && 
                               this.currentFileName.trim() !== '' && 
                               this.currentFileName.trim() !== 'NaN';
        const filePath = isValidFilePath ? this.currentFileName : undefined;
        
        this.currentFileName = "";

        if (this.onConvertCallback) {
            this.onConvertCallback(filePath);
        }
    }

    getWidget(): Widget {
        return this.container;
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }

    getCurrentFilePath(): string {
        return this.currentFileName;
    }
}
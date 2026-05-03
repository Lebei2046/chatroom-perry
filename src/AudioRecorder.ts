import {
    VStack, HStack, Text, Button, VStackWithInsets,
    widgetAddChild, widgetSetBackgroundColor, widgetSetHeight, widgetSetWidth,
    setPadding, setCornerRadius, widgetSetHidden, textSetString, appSetTimer
} from "perry/ui";
import { audioStart, audioStop, audioGetLevel, audioGetPeak } from "perry/system";

export interface AudioRecorderOptions {
    onSend?: (duration: number) => void;
    onCancel?: () => void;
    onConvert?: () => void;
}

export class AudioRecorder {
    private isRecording = false;
    private recordingStartTime = 0;
    private recordedDuration = 0;
    private timerActive = false;

    private container: Widget;
    private indicatorBubble: Widget;
    private waveformText: Widget;
    private timeIndicator: Widget;
    private cancelButton: Widget;
    private convertButton: Widget;
    private releaseHint: Widget;

    private onSendCallback?: (duration: number) => void;
    private onCancelCallback?: () => void;
    private onConvertCallback?: () => void;

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

        this.cancelButton = Button("取消", () => {
            this.cancel();
        });
        widgetSetWidth(this.cancelButton, 100);
        widgetSetHeight(this.cancelButton, 44);
        setCornerRadius(this.cancelButton, 22);
        widgetSetBackgroundColor(this.cancelButton, 0.9, 0.9, 0.95, 1.0);
        widgetSetHidden(this.cancelButton, 1);

        this.convertButton = Button("滑到这里 转文字", () => {
            this.convert();
        });
        widgetSetWidth(this.convertButton, 140);
        widgetSetHeight(this.convertButton, 44);
        setCornerRadius(this.convertButton, 22);
        widgetSetBackgroundColor(this.convertButton, 0.9, 0.7, 0.7, 1.0);
        widgetSetHidden(this.convertButton, 1);

        this.releaseHint = Text("松开 发送");

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

    private computeWaveformText(level: number, peak: number): string {
        let normalizedLevel = 0;
        if (level >= 30) {
            normalizedLevel = Math.min(1, (level - 30) / 80);
        }
        let value = Math.max(normalizedLevel, peak);
        const count = Math.max(3, Math.floor(value * 15));
        return "█".repeat(count) + " ".repeat(15 - count);
    }

    private updateTime(): void {
        if (!this.isRecording) return;
        this.recordedDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mins = Math.floor(this.recordedDuration / 60);
        const secs = this.recordedDuration % 60;
        textSetString(this.timeIndicator, `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }

    private pollAudioLevel(): void {
        if (!this.isRecording || !this.timerActive) return;

        const level = audioGetLevel();
        const peak = audioGetPeak();
        const waveform = this.computeWaveformText(level, peak);

        console.log(`[AudioRecorder] Poll - level: ${level}, peak: ${peak}, waveform: ${waveform}`);
        
        textSetString(this.waveformText, waveform);
        this.updateTime();
    }

    start(): void {
        if (this.isRecording) return;

        const success = audioStart();
        console.log(`[AudioRecorder] audioStart result: ${success}`);

        this.isRecording = true;
        this.timerActive = true;
        this.recordingStartTime = Date.now();
        this.recordedDuration = 0;

        widgetSetHidden(this.container, 0);
        widgetSetHidden(this.cancelButton, 0);
        widgetSetHidden(this.convertButton, 0);
        widgetSetBackgroundColor(this.indicatorBubble, 0.6, 1.0, 0.6, 1.0);

        textSetString(this.waveformText, "███████████████");
        textSetString(this.timeIndicator, "00:00");

        // Start polling timer
        appSetTimer(100, () => {
            this.pollAudioLevel();
        });
    }

    stop(): void {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.timerActive = false;
        audioStop();

        widgetSetHidden(this.container, 1);
        widgetSetHidden(this.cancelButton, 1);
        widgetSetHidden(this.convertButton, 1);

        this.recordedDuration = Math.max(1, Math.floor((Date.now() - this.recordingStartTime) / 1000));

        if (this.onSendCallback) {
            this.onSendCallback(this.recordedDuration);
        }
    }

    cancel(): void {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.timerActive = false;
        audioStop();

        widgetSetHidden(this.container, 1);
        widgetSetHidden(this.cancelButton, 1);
        widgetSetHidden(this.convertButton, 1);

        if (this.onCancelCallback) {
            this.onCancelCallback();
        }
    }

    convert(): void {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.timerActive = false;
        audioStop();

        widgetSetHidden(this.container, 1);
        widgetSetHidden(this.cancelButton, 1);
        widgetSetHidden(this.convertButton, 1);

        if (this.onConvertCallback) {
            this.onConvertCallback();
        }
    }

    getWidget(): Widget {
        return this.container;
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }
}
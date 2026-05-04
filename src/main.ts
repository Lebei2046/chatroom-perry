import {
    App, VStack, HStack, Text, Button, ScrollView, TextField,
    VStackWithInsets, widgetAddChild, widgetMatchParentWidth, widgetMatchParentHeight,
    widgetSetBackgroundColor, widgetSetHeight, widgetSetWidth, setPadding, setCornerRadius,
    widgetSetHidden, widgetSetOnClick
} from "perry/ui";
import { createPlayer, play, stop, destroy } from "perry/media";
import { AudioRecorder } from "./AudioRecorder";

interface Message {
    id: number;
    text: string;
    type: "text" | "voice" | "emoji" | "plus";
    isSent: boolean;
    duration?: number;
    filePath?: string;
    playerHandle?: number;
}

const messages: Message[] = [
    { id: 1, text: "Hello!", type: "text", isSent: true },
    { id: 2, text: "Hi there! How can I help you?", type: "text", isSent: false },
    { id: 3, text: "I need help with PerryTS", type: "text", isSent: true },
];

let messageIdCounter = 4;
let currentTextInput = "";
let messageContainer: Widget;
let isVoiceMode = false;

let textInputRow: Widget;
let voiceInputRow: Widget;
let holdAndSpeakButton: Widget;
let textInputContainer: Widget;
let audioRecorder: any;

function createMessageBubble(message: Message): Widget {
    const bubble = VStackWithInsets(8, 12, 16, 12, 16);

    if (message.isSent) {
        widgetSetBackgroundColor(bubble, 0.2, 0.5, 0.8, 1.0);
    } else {
        widgetSetBackgroundColor(bubble, 0.9, 0.9, 0.9, 1.0);
    }

    setCornerRadius(bubble, 16);

    if (message.type === "voice") {
        const content = HStack(8, [
            Text("🔊"),
            Text("▮▮▮▮▮▮▮▮"),
            Text(`${message.duration}''`)
        ]);
        widgetAddChild(bubble, content);

        if (message.filePath) {
            widgetSetOnClick(bubble, () => {
                if (message.playerHandle && message.playerHandle > 0) {
                    play(message.playerHandle);
                } else {
                    const handle = createPlayer(message.filePath!);
                    if (handle > 0) {
                        message.playerHandle = handle;
                        play(handle);
                    }
                }
            });
        }
    } else {
        const text = Text(message.text);
        widgetAddChild(bubble, text);
    }

    return bubble;
}

function renderMessages(): Widget {
    const messageList = VStackWithInsets(8, 0, 16, 0, 16);

    messages.forEach((msg) => {
        const bubble = createMessageBubble(msg);
        widgetAddChild(messageList, bubble);
    });

    return messageList;
}

function showToast(message: string): void {
    console.log(`Toast: ${message}`);
}

function switchToVoiceMode() {
    isVoiceMode = true;
    widgetSetHidden(textInputRow, 1);
    widgetSetHidden(voiceInputRow, 0);
}

function switchToTextMode() {
    isVoiceMode = false;
    widgetSetHidden(voiceInputRow, 1);
    widgetSetHidden(textInputRow, 0);
    widgetSetBackgroundColor(holdAndSpeakButton, 0.6, 0.6, 0.6, 1.0);
    
    if (audioRecorder && audioRecorder.getIsRecording()) {
        audioRecorder.stop();
    }
}

function main(): void {
    messageContainer = renderMessages();

    const scrollView = ScrollView();
    widgetMatchParentWidth(scrollView);
    widgetMatchParentHeight(scrollView);
    widgetAddChild(scrollView, messageContainer);

    const textField = TextField("Enter message...", (value) => {
        currentTextInput = value;
    });
    widgetSetWidth(textField, 140);
    widgetSetHeight(textField, 32);

    const voiceToTextButton = Button("🔊", () => {
        showToast("Voice recognizer activated - speak now");
    });
    widgetSetWidth(voiceToTextButton, 32);
    widgetSetHeight(voiceToTextButton, 32);
    setCornerRadius(voiceToTextButton, 16);
    widgetSetBackgroundColor(voiceToTextButton, 1.0, 1.0, 1.0, 1.0);

    const emojiButton = Button("😊", () => {
        showToast("Emoji picker opened");
    });
    widgetSetWidth(emojiButton, 40);
    widgetSetHeight(emojiButton, 40);
    setCornerRadius(emojiButton, 20);
    widgetSetBackgroundColor(emojiButton, 0.9, 0.9, 0.9, 1.0);

    const plusButton = Button("➕", () => {
        showToast("Plus menu opened");
    });
    widgetSetWidth(plusButton, 40);
    widgetSetHeight(plusButton, 40);
    setCornerRadius(plusButton, 20);
    widgetSetBackgroundColor(plusButton, 0.9, 0.9, 0.9, 1.0);

    textInputContainer = HStack(4, [textField, voiceToTextButton]);
    setCornerRadius(textInputContainer, 20);
    widgetSetBackgroundColor(textInputContainer, 0.9, 0.9, 0.9, 1.0);
    widgetSetWidth(textInputContainer, 180);
    widgetSetHeight(textInputContainer, 36);

    holdAndSpeakButton = Button("Hold and Speak", () => {
        if (!audioRecorder.getIsRecording()) {
            audioRecorder.start();
            widgetSetBackgroundColor(holdAndSpeakButton, 0.8, 0.2, 0.2, 1.0);
        } else {
            audioRecorder.stop();
            widgetSetBackgroundColor(holdAndSpeakButton, 0.6, 0.6, 0.6, 1.0);
        }
    });
    widgetSetWidth(holdAndSpeakButton, 180);
    widgetSetHeight(holdAndSpeakButton, 36);
    setCornerRadius(holdAndSpeakButton, 20);

    audioRecorder = new AudioRecorder({
        onSend: (duration: number, filePath?: string) => {
            const newMessage: Message = {
                id: messageIdCounter++,
                text: `Voice message ${duration}s`,
                type: "voice",
                isSent: true,
                duration: duration,
                filePath: filePath
            };
            messages.push(newMessage);
            widgetAddChild(messageContainer, createMessageBubble(newMessage));
            const toastMsg = filePath
                ? `Voice message sent (${duration}s) - saved to ${filePath}`
                : `Voice message sent (${duration}s)`;
            showToast(toastMsg);
            switchToTextMode();
        },
        onCancel: () => {
            showToast("Recording cancelled");
            switchToTextMode();
        },
        onConvert: () => {
            currentTextInput = "Voice converted text";
            showToast("Voice converted to text");
            switchToTextMode();
        }
    });

    const voiceButton = Button("🎤", () => {
        if (isVoiceMode) {
            switchToTextMode();
        } else {
            switchToVoiceMode();
        }
    });
    widgetSetWidth(voiceButton, 40);
    widgetSetHeight(voiceButton, 40);
    setCornerRadius(voiceButton, 20);
    widgetSetBackgroundColor(voiceButton, 0.9, 0.9, 0.9, 1.0);

    textInputRow = HStack(8, [voiceButton, textInputContainer, emojiButton, plusButton]);
    setPadding(textInputRow, 8, 16, 16, 16);

    const voiceButtonForVoice = Button("🎤", () => {
        if (isVoiceMode) {
            switchToTextMode();
        } else {
            switchToVoiceMode();
        }
    });
    widgetSetWidth(voiceButtonForVoice, 40);
    widgetSetHeight(voiceButtonForVoice, 40);
    setCornerRadius(voiceButtonForVoice, 20);
    widgetSetBackgroundColor(voiceButtonForVoice, 0.9, 0.9, 0.9, 1.0);

    const emojiButtonForVoice = Button("😊", () => {
        showToast("Emoji picker opened");
    });
    widgetSetWidth(emojiButtonForVoice, 40);
    widgetSetHeight(emojiButtonForVoice, 40);
    setCornerRadius(emojiButtonForVoice, 20);
    widgetSetBackgroundColor(emojiButtonForVoice, 0.9, 0.9, 0.9, 1.0);

    const plusButtonForVoice = Button("➕", () => {
        showToast("Plus menu opened");
    });
    widgetSetWidth(plusButtonForVoice, 40);
    widgetSetHeight(plusButtonForVoice, 40);
    setCornerRadius(plusButtonForVoice, 20);
    widgetSetBackgroundColor(plusButtonForVoice, 0.9, 0.9, 0.9, 1.0);

    voiceInputRow = HStack(8, [voiceButtonForVoice, holdAndSpeakButton, emojiButtonForVoice, plusButtonForVoice]);
    setPadding(voiceInputRow, 8, 16, 16, 16);
    widgetSetHidden(voiceInputRow, 1);

    const inputContainer = VStack(0, [textInputRow, voiceInputRow]);

    const mainLayout = VStack([scrollView, audioRecorder.getWidget(), inputContainer]);
    widgetMatchParentWidth(mainLayout);
    widgetMatchParentHeight(mainLayout);

    App({
        title: "Chatroom",
        width: 375,
        height: 667,
        body: mainLayout
    });
}

main();

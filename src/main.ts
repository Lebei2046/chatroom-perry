import {
    App, VStack, HStack, Text, Button, ScrollView, TextField,
    VStackWithInsets, widgetAddChild, widgetMatchParentWidth, widgetMatchParentHeight,
    widgetSetBackgroundColor, widgetSetHeight, widgetSetWidth, setPadding, setCornerRadius,
    widgetSetHidden
} from "perry/ui";
import { AudioRecorder } from "./AudioRecorder";

interface Message {
    id: number;
    text: string;
    type: "text" | "voice" | "emoji" | "plus";
    isSent: boolean;
    duration?: number;
}

const messages: Message[] = [
    { id: 1, text: "Hello!", type: "text", isSent: true },
    { id: 2, text: "Hi there! How can I help you?", type: "text", isSent: false },
    { id: 3, text: "I need help with PerryTS", type: "text", isSent: true },
];

let messageIdCounter = 4;
let currentTextInput = "";
let messageContainer: Widget;

function createMessageBubble(message: Message): Widget {
    const bubble = VStackWithInsets(8, 12, 16, 12, 16);

    if (message.isSent) {
        widgetSetBackgroundColor(bubble, 0.2, 0.5, 0.8, 1.0);
    } else {
        widgetSetBackgroundColor(bubble, 0.9, 0.9, 0.9, 1.0);
    }

    setCornerRadius(bubble, 16);

    if (message.type === "voice") {
        const content = HStack(8);
        const playIcon = Text("🔊");
        const durationText = Text(`${message.duration}''`);
        const waveform = Text("▮▮▮▮▮▮▮▮");
        widgetAddChild(content, playIcon);
        widgetAddChild(content, waveform);
        widgetAddChild(content, durationText);
        widgetAddChild(bubble, content);
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

function main(): void {
    messageContainer = renderMessages();

    const scrollView = ScrollView();
    widgetMatchParentWidth(scrollView);
    widgetMatchParentHeight(scrollView);
    widgetAddChild(scrollView, messageContainer);

    const textField = TextField("Enter message...", (value) => {
        currentTextInput = value;
    });
    widgetSetWidth(textField, 200);
    widgetSetHeight(textField, 44);
    setPadding(textField, 8, 16, 8, 16);
    setCornerRadius(textField, 22);
    widgetSetBackgroundColor(textField, 0.9, 0.9, 0.9, 1.0);

    const audioRecorder = new AudioRecorder({
        onSend: (duration: number) => {
            const newMessage: Message = {
                id: messageIdCounter++,
                text: `Voice message ${duration}s`,
                type: "voice",
                isSent: true,
                duration: duration
            };
            messages.push(newMessage);
            widgetAddChild(messageContainer, createMessageBubble(newMessage));
            showToast(`Voice message sent (${duration}s)`);
            widgetSetHidden(holdAndSpeakButton, 1);
            widgetSetHidden(voiceButton, 0);
            widgetSetHidden(textField, 0);
            widgetSetBackgroundColor(holdAndSpeakButton, 0.6, 0.6, 0.6, 1.0);
        },
        onCancel: () => {
            showToast("Recording cancelled");
            widgetSetHidden(holdAndSpeakButton, 1);
            widgetSetHidden(voiceButton, 0);
            widgetSetHidden(textField, 0);
            widgetSetBackgroundColor(holdAndSpeakButton, 0.6, 0.6, 0.6, 1.0);
        },
        onConvert: () => {
            currentTextInput = "Voice converted text";
            showToast("Voice converted to text");
            widgetSetHidden(holdAndSpeakButton, 1);
            widgetSetHidden(voiceButton, 0);
            widgetSetHidden(textField, 0);
            widgetSetBackgroundColor(holdAndSpeakButton, 0.6, 0.6, 0.6, 1.0);
        }
    });

    const holdAndSpeakButton = Button("Hold and Speak", () => {
        if (!audioRecorder.getIsRecording()) {
            audioRecorder.start();
            widgetSetBackgroundColor(holdAndSpeakButton, 0.8, 0.2, 0.2, 1.0);
        } else {
            audioRecorder.stop();
            widgetSetBackgroundColor(holdAndSpeakButton, 0.6, 0.6, 0.6, 1.0);
        }
    });
    widgetSetWidth(holdAndSpeakButton, 200);
    widgetSetHeight(holdAndSpeakButton, 44);
    setCornerRadius(holdAndSpeakButton, 22);
    widgetSetBackgroundColor(holdAndSpeakButton, 0.6, 0.6, 0.6, 1.0);
    widgetSetHidden(holdAndSpeakButton, 1);

    const voiceButton = Button("🎤", () => {
        widgetSetHidden(voiceButton, 1);
        widgetSetHidden(textField, 1);
        widgetSetHidden(voiceToTextButton, 1);
        widgetSetHidden(plusButton, 1);
        widgetSetHidden(holdAndSpeakButton, 0);
    });
    widgetSetWidth(voiceButton, 44);
    widgetSetHeight(voiceButton, 44);
    setCornerRadius(voiceButton, 22);

    const voiceToTextButton = Button("🔊", () => {
        showToast("Voice recognizer activated - speak now");
    });
    widgetSetWidth(voiceToTextButton, 44);
    widgetSetHeight(voiceToTextButton, 44);
    setCornerRadius(voiceToTextButton, 22);

    const emojiButton = Button("😊", () => {
        showToast("Emoji picker opened");
    });
    widgetSetWidth(emojiButton, 44);
    widgetSetHeight(emojiButton, 44);
    setCornerRadius(emojiButton, 22);

    const plusButton = Button("➕", () => {
        showToast("Plus menu opened");
    });
    widgetSetWidth(plusButton, 44);
    widgetSetHeight(plusButton, 44);
    setCornerRadius(plusButton, 22);

    const inputRow = HStack(8, [
        voiceButton,
        voiceToTextButton,
        textField,
        holdAndSpeakButton,
        emojiButton,
        plusButton
    ]);
    setPadding(inputRow, 8, 16, 16, 16);

    const mainLayout = VStack([scrollView, audioRecorder.getWidget(), inputRow]);
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
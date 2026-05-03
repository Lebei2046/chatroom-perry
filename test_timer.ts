import { App, Button, Text, VStack, widgetAddChild, widgetSetOnClick, widgetMatchParentWidth, widgetMatchParentHeight, appSetTimer } from "perry/ui";

let count = 0;
let timerRunning = false;

function createUI(): Widget {
    const root = VStack();
    widgetMatchParentWidth(root);
    widgetMatchParentHeight(root);

    const title = Text("appSetTimer Test", "title");
    widgetAddChild(root, title);

    const countText = Text(`Count: ${count}`, "count");
    widgetAddChild(root, countText);

    const startBtn = Button("Start Timer (3s interval)", () => {
        if (timerRunning) return;
        timerRunning = true;
        count = 0;
        console.log("Timer started!");
        appSetTimer(3000, timerCallback);
    });
    widgetAddChild(root, startBtn);

    const stopBtn = Button("Stop Timer", () => {
        timerRunning = false;
        console.log("Timer stopped!");
    });
    widgetAddChild(root, stopBtn);

    const info = Text("If timer is recurring, count should increase every 3s automatically.", "info");
    widgetAddChild(root, info);

    return root;
}

function timerCallback() {
    count++;
    console.log(`Timer fired! Count: ${count}`);

    if (timerRunning) {
        console.log("Rescheduling timer...");
        appSetTimer(3000, timerCallback);
    }
}

const ui = createUI();
App({ title: "Timer Test", width: 300, height: 400, body: ui });

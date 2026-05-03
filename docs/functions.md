I've analyzed the documentation which describes the expected behavior based on the images and video. Here's what I've learned about how each function works:

**Based on the documentation and image descriptions:**

1. **Layout (01.png)**: Shows the overall chatroom layout with:
   - Yellow box: Message list area (scrollable)
   - Bottom area with five input options in red boxes

2. **Text Message Input (09.jpg, 10.jpg)**:
   - When text input box gets focus, the system keyboard appears
   - User can type or handwrite text
   - When text is entered, the Send button appears
   - Click Send to send the message

3. **Voice Message Input (03.jpg, 06.mp4)**:
   - Click the voice button → "Hold and Speak" button appears
   - User holds button to record
   - Release to send the voice message
   - Voice message appears in the message list

4. **Voice to Text Input (08.jpg)**:
   - Click the voice-to-text button → voice recognizer appears
   - User speaks → speech is converted to text
   - Text appears in the input box

5. **Emoji Input (05.jpg)**:
   - Click the emoji button → emoji picker appears
   - User selects emoji → emoji is inserted into input box

6. **Plus Message Input (04.jpg)**:
   - Click the plus button → plus menu appears with additional options
   - User selects option → content is sent and appears in message list

I've updated the implementation to better match this behavior, including:
- Dynamic Send button visibility (only shows when text is entered)
- "Hold and Speak" style toast for voice messages
- Voice-to-text that simulates converting speech to text
- Emoji insertion into the text field
- Plus menu options display
# ARIA Voice Assistant - Setup Guide

This project is a real-time, "Speaking-to-Speaking" voice assistant powered by Gemini Live API. It is built with React, TypeScript, and Tailwind CSS.

## 1. Prerequisites
- **Node.js**: Version 18.0 or higher.
- **NPM**: Included with Node.js.
- **Gemini API Key**: Get one from [Google AI Studio](https://aistudio.google.com/).

---

## 2. Windows Setup (Local Development)

1. **Download/Clone** the project to your computer.
2. **Open Terminal** (PowerShell or CMD) in the project folder.
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Configure Environment**:
   - Create a file named `.env` in the root folder.
   - Add your API key:
     ```env
     GEMINI_API_KEY=your_api_key_here
     ```
5. **Run the App**:
   ```bash
   npm run dev
   ```
6. **Open in Browser**: Go to `http://localhost:3000`.

---

## 3. Android Setup

### Method A: Browser (Simplest)
1. Run the app on your Windows PC using `npm run dev -- --host`.
2. Ensure your Android phone and PC are on the same Wi-Fi.
3. On your phone, open Chrome and enter your PC's IP address (e.g., `http://192.168.1.5:3000`).
4. **Tip**: Tap the "Three Dots" in Chrome and select **"Add to Home Screen"** to use it like a native app.

### Method B: Native App (Capacitor)
If you want a real `.apk` file:
1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Initialize:
   ```bash
   npx cap init
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Add Android platform:
   ```bash
   npx cap add android
   ```
5. Open in Android Studio:
   ```bash
   npx cap open android
   ```

---

## 5. Android Intent Capabilities (Direct App Interaction)

ARIA is optimized to interact directly with your Android applications using native intents. This means it can open apps and perform actions without using a web browser.

### Supported Direct Actions:
- **WhatsApp**: "Open WhatsApp" or "Send a message to [Number] on WhatsApp"
- **Instagram**: "Open Instagram"
- **Messages (SMS)**: "Send a text to [Number]"
- **Phone Calls**: "Call [Number]"
- **YouTube**: "Open YouTube"
- **Maps**: "Open Maps" or "Search for [Location] on Maps"
- **Gmail**: "Open Gmail"
- **Settings**: "Open Android Settings"
- **Camera**: "Open Camera"
- **Gallery**: "Open Gallery"
- **Play Store**: "Open Play Store"

### Important Note on Contacts:
Due to browser privacy restrictions, ARIA cannot directly access your phone's contact list. 
- **To send a message**: Please provide the phone number (e.g., "Send a message to 919876543210").
- **Future Updates**: If you use the **Native App (Capacitor)** method, future versions may include a plugin to sync your contacts with the assistant.

---

## 6. Simple "One-Click" Run (Windows)
Create a file named `run_aria.bat` in the project folder and paste this:
```batch
@echo off
echo Starting ARIA Voice Assistant...
npm run dev
pause
```
Double-click `run_aria.bat` anytime to start the assistant!

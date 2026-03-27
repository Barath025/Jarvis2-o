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

## 4. Simple "One-Click" Run (Windows)
Create a file named `run_aria.bat` in the project folder and paste this:
```batch
@echo off
echo Starting ARIA Voice Assistant...
npm run dev
pause
```
Double-click `run_aria.bat` anytime to start the assistant!

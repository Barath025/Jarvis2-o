# JARVIS System - Windows Setup Guide

This system is optimized for both Android and Windows. Follow these steps to run it on your Windows machine:

## 1. Prerequisites
1. **Node.js**: Download and install from [nodejs.org](https://nodejs.org/).
2. **NPM**: Included with Node.js.

## 2. Setup Instructions
1. **Download the project**: Extract the files to a folder on your Windows computer.
2. **Run Setup**: Double-click the `setup.bat` file. This will install all dependencies.
3. **Configure Environment**: Open the `.env` file and add your `VITE_GEMINI_API_KEY`. The Supabase credentials have already been configured for you.
4. **Start the System**: You can either:
   - Double-click the `run.bat` file.
   - Or open a terminal and run `npm run dev`.
5. **Access the App**: Open your browser and go to `http://localhost:3000`.

## 3. Environment Variables
The system uses a Gemini API key for AI features and Supabase for data storage.
- **VITE_GEMINI_API_KEY**: Add your own Gemini API key to the `.env` file for your own security and quota.
- **VITE_SUPABASE_URL**: Already configured in `.env`.
- **VITE_SUPABASE_ANON_KEY**: Already configured in `.env`.

## 4. Windows Automation Features
JARVIS is now equipped with a local automation server for deep Windows control:
- **Notepad Control**: Open, type in, and close Notepad via voice.
- **WhatsApp Integration**: Check if WhatsApp is installed and send messages.
- **Notification Reading**: JARVIS automatically polls for system notifications and reads them aloud.
- **Notification Blocking**: Ask JARVIS to "block notifications" to silence them.
- **App Control**: Open any system application by name.

**Note**: To use these features, ensure you run the system using `npm run dev` or `run.bat`, which starts the local Express server that bridges the browser to your Windows OS.

## 5. Android Intent Capabilities
JARVIS can interact directly with your Android applications using native intents:
- **WhatsApp**: "Open WhatsApp" or "Send a message to [Number] on WhatsApp"
- **Instagram**: "Open Instagram"
- **Messages (SMS)**: "Send a text to [Number]"
- **Phone Calls**: "Call [Number]"
- **YouTube**: "Open YouTube"
- **Maps**: "Open Maps"
- **Gmail**: "Open Gmail"
- **Settings**: "Open Android Settings"
- **Camera**: "Open Camera"
- **Gallery**: "Open Gallery"
- **Play Store**: "Open Play Store"

Developed by Barath.

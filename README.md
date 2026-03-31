# JARVIS System - Windows Setup Guide

This system is optimized for both Android and Windows. Follow these steps to run it on your Windows machine:

## 1. Prerequisites
1. **Node.js**: Download and install from [nodejs.org](https://nodejs.org/).
2. **NPM**: Included with Node.js.

## 2. Setup Instructions
1. **Download the project**: Extract the files to a folder on your Windows computer.
2. **Run Setup**: Double-click the `setup.bat` file. This will automatically install all necessary dependencies.
3. **Start the System**: Open a terminal (CMD or PowerShell) in the project folder and run:
   ```bash
   npm run dev
   ```
4. **Access the App**: Open your browser and go to `http://localhost:3000`.

## 3. Environment Variables
The system uses a Gemini API key for AI features. 
- **Note**: You mentioned you don't need a `.env` file. The system has a fallback key configured in `src/services/gemini.ts`. 
- **Recommendation**: For your own security and to use your own quota, it is recommended to create a `.env` file based on `.env.example` and add your own `GEMINI_API_KEY`.

## 4. Windows-Specific Features
- **Notepad Automation**: JARVIS can open and type in Notepad on Windows.
- **Chrome Search**: Optimized search intents for Windows Chrome.
- **System Diagnostics**: Real-time monitoring of system hooks.

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

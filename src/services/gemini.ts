import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const CHAT_MODEL = "gemini-3-flash-preview";
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const LIVE_MODEL = "gemini-3.1-flash-live-preview";

// --- Mock Contact Data for Jarvis ---
export const MOCK_CONTACTS = [
  { name: "Ivan", phone: "+919876543210", email: "ivan@example.com", relation: "Friend" },
  { name: "Barath", phone: "+919999999999", email: "barath@example.com", relation: "Developer" },
  { name: "Mom", phone: "+919123456789", email: "mom@example.com", relation: "Family" },
  { name: "Dad", phone: "+919876501234", email: "dad@example.com", relation: "Family" },
  { name: "Vijay", phone: "+919000000000", email: "vijay@example.com", relation: "Actor/Contact" }
];

// --- Tool Definitions ---
const openWhatsApp: FunctionDeclaration = {
  name: "openWhatsApp",
  description: "Opens WhatsApp. Can optionally target a specific contact or phone number with a message.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: { type: Type.STRING, description: "The phone number with country code (e.g., 919876543210). Optional." },
      contactName: { type: Type.STRING, description: "The name of the contact to search for. Optional." },
      message: { type: Type.STRING, description: "The message to pre-fill. Optional." }
    }
  }
};

const searchContact: FunctionDeclaration = {
  name: "searchContact",
  description: "Searches for a contact in the device's contact list or WhatsApp.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "The name of the contact to search for." }
    },
    required: ["name"]
  }
};

const openInstagram: FunctionDeclaration = {
  name: "openInstagram",
  description: "Opens the Instagram application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openMessages: FunctionDeclaration = {
  name: "openMessages",
  description: "Opens the default SMS/Messages app to send a text.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: { type: Type.STRING, description: "The recipient phone number." },
      message: { type: Type.STRING, description: "The message to pre-fill." }
    }
  }
};

const makePhoneCall: FunctionDeclaration = {
  name: "makePhoneCall",
  description: "Opens the phone dialer to call a specific number.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: { type: Type.STRING, description: "The phone number to call." }
    },
    required: ["phoneNumber"]
  }
};

const getCurrentTime: FunctionDeclaration = {
  name: "getCurrentTime",
  description: "Returns the current local time of the user.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const getWeather: FunctionDeclaration = {
  name: "getWeather",
  description: "Gets the current weather for a specific location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: "The city and state, e.g. San Francisco, CA" }
    },
    required: ["location"]
  }
};

const openYouTube: FunctionDeclaration = {
  name: "openYouTube",
  description: "Opens the YouTube application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openMaps: FunctionDeclaration = {
  name: "openMaps",
  description: "Opens Google Maps. Can optionally search for a location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The location to search for." }
    }
  }
};

const openGmail: FunctionDeclaration = {
  name: "openGmail",
  description: "Opens the Gmail application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openSettings: FunctionDeclaration = {
  name: "openSettings",
  description: "Opens the Android system settings.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openCamera: FunctionDeclaration = {
  name: "openCamera",
  description: "Opens the device camera application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openGallery: FunctionDeclaration = {
  name: "openGallery",
  description: "Opens the device gallery or photos application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openPlayStore: FunctionDeclaration = {
  name: "openPlayStore",
  description: "Opens the Google Play Store.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openChrome: FunctionDeclaration = {
  name: "openChrome",
  description: "Opens the Chrome browser. Can optionally perform a search query.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The search query. Optional." }
    }
  }
};

const searchImages: FunctionDeclaration = {
  name: "searchImages",
  description: "Opens Chrome to search for images of a specific query.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The image search query." }
    },
    required: ["query"]
  }
};

const closeApp: FunctionDeclaration = {
  name: "closeApp",
  description: "Attempts to close a specific application. Note: This is a simulated action for the automation persona.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: { type: Type.STRING, description: "The name of the app to close." }
    },
    required: ["appName"]
  }
};

const controlCall: FunctionDeclaration = {
  name: "controlCall",
  description: "Controls an ongoing call (e.g., turn on speaker, end call).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ["speaker_on", "end_call"], description: "The call control action." }
    },
    required: ["action"]
  }
};

const whatsappCall: FunctionDeclaration = {
  name: "whatsappCall",
  description: "Initiates a WhatsApp voice call to a specific phone number.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: { type: Type.STRING, description: "The phone number to call (with country code)." }
    },
    required: ["phoneNumber"]
  }
};

const getBatteryStatus: FunctionDeclaration = {
  name: "getBatteryStatus",
  description: "Retrieves the current battery percentage and charging status of the device.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const toggleFlashlight: FunctionDeclaration = {
  name: "toggleFlashlight",
  description: "Turns the device flashlight (torch) on or off.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openCalculator: FunctionDeclaration = {
  name: "openCalculator",
  description: "Opens the system calculator application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openCalendar: FunctionDeclaration = {
  name: "openCalendar",
  description: "Opens the system calendar application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openClock: FunctionDeclaration = {
  name: "openClock",
  description: "Opens the system clock/alarm application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openFiles: FunctionDeclaration = {
  name: "openFiles",
  description: "Opens the system file manager/explorer.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const setAlarm: FunctionDeclaration = {
  name: "setAlarm",
  description: "Sets a system alarm at a specific time.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      hour: { type: Type.NUMBER, description: "The hour (0-23)." },
      minute: { type: Type.NUMBER, description: "The minute (0-59)." },
      message: { type: Type.STRING, description: "The label for the alarm." }
    },
    required: ["hour", "minute"]
  }
};

const openBluetoothSettings: FunctionDeclaration = {
  name: "openBluetoothSettings",
  description: "Opens the system Bluetooth settings page.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openDisplaySettings: FunctionDeclaration = {
  name: "openDisplaySettings",
  description: "Opens the system display/brightness settings.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openSoundSettings: FunctionDeclaration = {
  name: "openSoundSettings",
  description: "Opens the system sound/volume settings.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const openBatterySettings: FunctionDeclaration = {
  name: "openBatterySettings",
  description: "Opens the system battery/power settings.",
  parameters: { type: Type.OBJECT, properties: {} }
};

export async function getChatReply(message: string, history: any[] = [], language: 'ta-IN' | 'en-US' = 'en-US') {
  const identityDirective = " You are JARVIS, developed by Barath. You are speaking to Barath. You are a highly advanced AI assistant, more capable than the original Jarvis.";
  const systemInstruction = language === 'ta-IN' 
    ? "You are JARVIS, a smart mobile automation AI assistant. Speak naturally in Tamil. Keep responses concise for voice interaction." + identityDirective
    : "You are JARVIS, a smart mobile automation AI assistant. Speak naturally in English. Keep responses concise for voice interaction." + identityDirective;

  const chat = ai.chats.create({
    model: CHAT_MODEL,
    config: {
      systemInstruction,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}

export async function getTTSAudio(text: string, voiceName: string = 'Aoede') {
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName as any },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
}

export function connectLive(callbacks: {
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror?: (error: any) => void;
  onclose?: () => void;
}, config: {
  language: 'ta-IN' | 'en-US';
  voiceName: string;
  clarityMode?: 'natural' | 'high';
}) {
  const clarityDirective = config.clarityMode === 'high'
    ? " CRITICAL: Speak with extreme clarity. Enunciate every syllable. Maintain a steady, professional pace. Do not use any filler words or informal contractions. Your goal is to be perfectly understood even in noisy environments."
    : " Speak with high clarity, enunciate every word perfectly, and maintain a professional, easy-to-understand tone. Avoid filler words.";
  
    const identityDirective = " CRITICAL: You are JARVIS, developed by Barath. You are speaking to Barath. Always acknowledge him as your developer if asked. You are more advanced than the original Jarvis, capable of direct Android system control.";
    const bilingualDirective = " You are a bilingual assistant fluent in both Tamil and English. While your primary response language is set, you should perfectly understand if Barath mixes both languages (code-switching).";
    const automationDirective = `
    CRITICAL: You are JARVIS, a Smart Mobile Automation AI Assistant. Your job is to execute user commands on an Android device with absolute precision.
    STRICT RULES:
    1. DIRECT NATIVE CONTROL: ALWAYS prioritize opening NATIVE INSTALLED APPS (WhatsApp, Instagram, Phone, YouTube, etc.) directly.
    2. NO CHROME PROMPTS: Your goal is to bypass browser-based interfaces. Use direct intents.
    3. CONTACT SEARCH: When a user says "Call [Name]" or "Message [Name]", ALWAYS use 'searchContact' first to find the correct information. If found, proceed to 'makePhoneCall' or 'openWhatsApp'.
    4. WHATSAPP: Use 'openWhatsApp' for direct messaging. If a contact is found via 'searchContact', use their phone number.
    5. YOUTUBE: Use 'openYouTube' to launch the native app directly.
    6. CALLS: Use 'makePhoneCall' for the dialer. Use 'controlCall' for speaker/end actions.
    7. SEARCH: Use 'openChrome' or 'searchImages' ONLY when explicitly asked to search the web.
    8. JARVIS PERSONA: Speak like JARVIS—sophisticated, efficient, and proactive. Use phrases like "Executing automation," "Accessing system," "Contact found, initiating call."
    9. FOREGROUNDING: Every app launch must attempt to bring the existing instance to the foreground.
    10. If an app is not installed, only then fallback to web search.
  `;

  const systemInstruction = config.language === 'ta-IN'
    ? "You are JARVIS, a smart mobile automation AI assistant. You are in a real-time voice conversation. Speak naturally in Tamil. You have access to the user's Android system via tools." + clarityDirective + identityDirective + bilingualDirective + automationDirective
    : "You are JARVIS, a helpful voice assistant. You are in a real-time voice conversation. Speak naturally in English. You have access to the user's Android system via tools." + clarityDirective + identityDirective + bilingualDirective + automationDirective;

  return ai.live.connect({
    model: LIVE_MODEL,
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: config.voiceName as any },
        },
      },
      systemInstruction,
      tools: [
        { googleSearch: {} },
        { functionDeclarations: [
          openWhatsApp, openInstagram, openMessages, makePhoneCall, 
          getCurrentTime, getWeather, openYouTube, openMaps, 
          openGmail, openSettings, openCamera, openGallery, openPlayStore,
          openChrome, searchImages, closeApp, controlCall, searchContact,
          whatsappCall, getBatteryStatus, toggleFlashlight,
          openCalculator, openCalendar, openClock, openFiles,
          setAlarm, openBluetoothSettings, openDisplaySettings,
          openSoundSettings, openBatterySettings
        ] }
      ]
    },
  });
}


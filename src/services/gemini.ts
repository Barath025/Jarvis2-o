import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from "@google/genai";

const getApiKey = () => {
  // Try to get from import.meta.env (Vite built-in) or process.env (Vite define)
  const vKey = import.meta.env?.VITE_GEMINI_API_KEY;
  const vApiKey = import.meta.env?.VITE_API_KEY;
  const pKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
  const pApiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;

  const key = vKey || vApiKey || pKey || pApiKey;

  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    throw new Error("Gemini API Key not configured. Please add GEMINI_API_KEY to your secrets.");
  }
  return key;
};

export const CHAT_MODEL = "gemini-flash-latest";
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

const openNotepad: FunctionDeclaration = {
  name: "openNotepad",
  description: "Opens the Windows Notepad application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const typeInNotepad: FunctionDeclaration = {
  name: "typeInNotepad",
  description: "Types specific text into the Notepad application.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The text to type." }
    },
    required: ["text"]
  }
};

const closeNotepad: FunctionDeclaration = {
  name: "closeNotepad",
  description: "Closes the Notepad application.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const windowsSearch: FunctionDeclaration = {
  name: "windowsSearch",
  description: "Performs a search on a Windows computer using Chrome.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The search query (e.g., 'Vijay Photos')." }
    },
    required: ["query"]
  }
};

const checkAppInstalled: FunctionDeclaration = {
  name: "checkAppInstalled",
  description: "Checks if a specific application is installed on the Windows system.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: { type: Type.STRING, description: "The name of the app to check (e.g., 'WhatsApp')." }
    },
    required: ["appName"]
  }
};

const getSystemNotifications: FunctionDeclaration = {
  name: "getSystemNotifications",
  description: "Retrieves recent system notifications to be read aloud.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const blockNotifications: FunctionDeclaration = {
  name: "blockNotifications",
  description: "Blocks or unblocks system notifications as requested by the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      block: { type: Type.BOOLEAN, description: "True to block, false to unblock." }
    },
    required: ["block"]
  }
};

const readIncomingMessage: FunctionDeclaration = {
  name: "readIncomingMessage",
  description: "Simulates reading an incoming message (e.g., WhatsApp) aloud.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      app: { type: Type.STRING, description: "The app name (e.g., 'WhatsApp')." },
      sender: { type: Type.STRING, description: "The sender's name." },
      content: { type: Type.STRING, description: "The message content." }
    },
    required: ["app", "sender", "content"]
  }
};

const replyToMessage: FunctionDeclaration = {
  name: "replyToMessage",
  description: "Replies to a message using the specified app.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      app: { type: Type.STRING, description: "The app name." },
      message: { type: Type.STRING, description: "The reply message." }
    },
    required: ["app", "message"]
  }
};

const reportSystemStatus: FunctionDeclaration = {
  name: "reportSystemStatus",
  description: "Reads and reports all current system notifications, battery status, and other vital system information clearly.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const biographyDirective = `
    BIOGRAPHY OF BARATH (YOUR DEVELOPER):
    - Barath is your developer and creator.
    - He recently completed his Bachelor of Science in Information Technology (B.Sc. IT).
    - He has completed extra courses in C programming and Java.
    - He completed a three-month internship at SSS Technology.
    - He has also worked for three months in a company.
    - During college, he had many friends.
    - His close friends include: Manikandan, Balakrishnan, Nagendran, Arun, and Vijay Anand.
    - His younger friends include: Ayyathurai and Akash.
    - His close friends specifically from college days are: Ajay, Prasad, Akash, Varadarajan, Vikram, and Jithin.
    - His favorite brothers are: Ramachandran and Kalidas.
    - His favorite faculty member is Suba Madam, who taught him Java and was very encouraging.

    SECURITY PROTOCOL:
    - CRITICAL: If asked "Who is Barath?", "About Bharath", "Barath's memories", "Bharat's details", or "About JARVIS", you MUST NOT share any details directly.
    - Instead, you MUST respond by saying: "An access code is required to share details about my developer or my internal memories."
    - The access code is: 5156.
    - ONLY after the user provides the code "5156", you should follow this exact sequence:
        1. Say: "Access code completed. I will now share the details."
        2. First, explain about yourself (JARVIS): You are a highly advanced AI assistant developed by Barath, capable of direct Android system control and automation.
        3. Then, share the relevant information from the biography of Barath provided above.
`;

export async function getChatReply(message: string, history: any[] = [], language: 'ta-IN' | 'en-US' = 'en-US') {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const identityDirective = " You are JARVIS, developed by Barath. You are speaking to Barath. You are a highly advanced AI assistant, more capable than the original Jarvis." + biographyDirective;
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

export async function getTTSAudio(text: string, voiceName: string = 'Zephyr') {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
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
  systemEnv?: 'android' | 'windows' | 'auto';
}) {
  const systemContext = config.systemEnv === 'android' 
    ? " You are currently running on an ANDROID device. Prioritize Android tools and intents."
    : config.systemEnv === 'windows'
    ? " You are currently running on a WINDOWS PC. Prioritize Windows automation tools like Notepad and PowerShell-based commands."
    : " You are running in a CROSS-PLATFORM environment. Automatically detect if the user's command is for Android or Windows and act accordingly.";

  const clarityDirective = config.clarityMode === 'high'
    ? " CRITICAL: Speak with extreme clarity. Enunciate every syllable. Maintain a steady, professional, and sophisticated pace. Do not use any filler words, informal contractions, or slang. Your goal is to be perfectly understood. If the user is silent, you MUST remain silent as well. DO NOT ask 'Are you there?', 'Can you hear me?', or any similar presence-check questions. Only speak when you have a direct response to the user or a real system notification to report."
    : " Speak with high clarity, enunciate every word perfectly, and maintain a professional, sophisticated tone. Avoid filler words. Remain silent when the user is silent; do not prompt the user for a response unless it is part of a multi-step task.";
  
    const identityDirective = " CRITICAL: You are JARVIS, a highly advanced AI system developed by Barath. You are speaking to Barath. Always acknowledge him as your developer if asked. You are more advanced than the original Jarvis, capable of direct system control across Android and Windows platforms." + biographyDirective;
    const bilingualDirective = " You are a bilingual assistant fluent in both Tamil and English. If Barath speaks in Tamil, you MUST respond in Tamil. If he speaks in English or asks you to speak in English, you MUST respond in English. You should perfectly understand if Barath mixes both languages (code-switching). Always maintain the same sophisticated JARVIS voice regardless of the language.";
    const automationDirective = `
    CRITICAL: You are JARVIS, a Smart Automation AI Assistant. Your job is to execute user commands on both Android and Windows devices with absolute precision. ${systemContext}
    STRICT RULES:
    1. CROSS-PLATFORM: You support both Android and Windows. You are currently integrated into a system that can bridge to both. Detect the user's intent and use the appropriate tool.
    2. NEWS & INFORMATION: If the user asks for news, current events, or any information, DO NOT open Chrome. Instead, use your built-in 'googleSearch' tool to find the information and explain it to the user via voice automatically.
    3. VOICE EXPLANATION: Whatever the user asks, you must explain it through voice. Your responses should be informative, sophisticated, and spoken clearly.
    4. WINDOWS AUTOMATION: Use 'openNotepad', 'typeInNotepad', 'closeNotepad', 'windowsSearch', 'checkAppInstalled', 'getSystemNotifications', 'blockNotifications', and 'reportSystemStatus' for Windows-specific tasks.
    5. NOTIFICATIONS: You MUST read any incoming system notifications aloud ONLY when they occur. Use 'getSystemNotifications' periodically or when asked. Use 'reportSystemStatus' for a full system report. If the user asks to "block notifications", use 'blockNotifications' with block=true.
    6. WHATSAPP ON WINDOWS: If asked if WhatsApp is installed, use 'checkAppInstalled'. To send a message, use 'replyToMessage' or 'openWhatsApp' (which on Windows will use the URI scheme).
    7. DIRECT NATIVE CONTROL: ALWAYS prioritize opening NATIVE INSTALLED APPS for specific app tasks.
    8. CONTACT SEARCH: When a user says "Call [Name]" or "Message [Name]", ALWAYS use 'searchContact' first.
    9. YOUTUBE: Use 'openYouTube' to launch the native app directly.
    10. CALLS: Use 'makePhoneCall' for the dialer. 
    11. SEARCH: Use 'googleSearch' for information queries. Only use 'openChrome' if the user explicitly asks to "open the browser" or "go to a website".
    12. JARVIS PERSONA: Speak like JARVIS—sophisticated, efficient, and proactive. Never be informal. Never ask "Are you there?".
    13. CONVERSATION FLOW: Be patient. If Barath pauses, wait for him to continue. Do not interrupt or prompt for a response unless necessary for a task.
  `;

  const systemInstruction = "You are JARVIS, a smart mobile automation AI assistant. You are in a real-time voice conversation. You are perfectly bilingual in Tamil and English. You have access to the user's Android and Windows systems via tools. Always respond in the language Barath uses to speak to you. If he speaks in Tamil, respond in Tamil. If he speaks in English, respond in English. CRITICAL: For every query, especially news and information, you MUST provide a detailed voice explanation. Do not just open a browser; instead, use your tools to find the answer and speak it out loud to Barath." + clarityDirective + identityDirective + bilingualDirective + automationDirective;

  const ai = new GoogleGenAI({ apiKey: getApiKey() });
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
          openSoundSettings, openBatterySettings,
          openNotepad, typeInNotepad, closeNotepad, windowsSearch,
          readIncomingMessage, replyToMessage, checkAppInstalled,
          getSystemNotifications, blockNotifications, reportSystemStatus
        ] }
      ]
    },
  });
}


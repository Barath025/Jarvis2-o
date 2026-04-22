import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from "@google/genai";

const getApiKey = () => {
  // 1. Prioritize Vercel-injected environment variable (secure)
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // 2. Fallback to localStorage (for local development/manual overrides)
  const lKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;

  if (!lKey || lKey === "MY_GEMINI_API_KEY" || lKey === "") {
    throw new Error(
      "Gemini API Key not found. " +
      "For deployment, please add 'GEMINI_API_KEY' to your Vercel Project Settings > Environment Variables. " +
      "For local development, please set it in your .env file."
    );
  }

  return lKey;
};

/**
 * Robust wrapper for Gemini API calls with automatic retry and error clearing
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    
    // If it's a transient error (quota, network, or temporary server issue), retry
    if (retries > 0 && (
      errorMessage.includes('429') || 
      errorMessage.includes('quota') || 
      errorMessage.includes('500') || 
      errorMessage.includes('503') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch')
    )) {
      console.warn(`JARVIS: API issue detected (${errorMessage}). Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    
    // If API key is invalid, clear the cache and throw a specific error
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
      if (typeof window !== 'undefined') localStorage.removeItem('GEMINI_API_KEY');
      throw new Error("Invalid API Key. Please check your configuration.");
    }

    throw error;
  }
}

export const CHAT_MODEL = "gemini-3-flash-preview";
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const APP_URL = import.meta.env?.VITE_APP_URL || process.env.APP_URL || "https://ais-dev-ofrlazz3mwlgxphzlxybbd-544681738605.asia-southeast1.run.app";
export const SUB_APP_NAME = "Developed Barath";

const activateDisplayMode: FunctionDeclaration = {
  name: "activateDisplayMode",
  description: "Activates the visual display mode (HUD) to show code, weather, info cards, or videos. Must be called when the user says 'display mode activate'.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

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

const playYouTubeVideo: FunctionDeclaration = {
  name: "playYouTubeVideo",
  description: "Searches for a video on YouTube and plays it directly within the JARVIS interface. Use this when the user asks to 'play' a specific video or match highlights.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The search query for the video (e.g., 'yesterday IPL match highlights')." },
      videoId: { type: Type.STRING, description: "The specific YouTube video ID if known. Optional." }
    },
    required: ["query"]
  }
};

const displayWeather3D: FunctionDeclaration = {
  name: "displayWeather3D",
  description: "Shows a high-tech 3D weather display on the JARVIS interface. Use this when the user asks for weather details or to 'show' the weather.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: "The location to show weather for." }
    },
    required: ["location"]
  }
};

const displayCode: FunctionDeclaration = {
  name: "displayCode",
  description: "Displays a code snippet (e.g., a Java for loop) on the JARVIS interface. Use this only when the user explicitly asks to 'display' or 'show' code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      language: { type: Type.STRING, description: "The programming language (e.g., 'java', 'javascript', 'python')." },
      code: { type: Type.STRING, description: "The code snippet to display." },
      title: { type: Type.STRING, description: "A title for the code snippet." }
    },
    required: ["language", "code"]
  }
};

const closeDisplay: FunctionDeclaration = {
  name: "closeDisplay",
  description: "Closes any active visual display (video, weather, code, info card) on the JARVIS interface. Use this when the user says 'close the display', 'stop showing', or 'clear the screen'.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const displayInfoCard: FunctionDeclaration = {
  name: "displayInfoCard",
  description: "Displays a structured information card on the JARVIS interface. Use this for IPL match stats, person details (name, district/town), or other structured data. Ensure the information is identified with 100% accuracy.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the card (e.g., 'IPL Match Stats', 'Person Details')." },
      subtitle: { type: Type.STRING, description: "A subtitle for the card." },
      details: { 
        type: Type.ARRAY, 
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING, description: "The label for the detail (e.g., 'Runs', 'Wickets', 'District')." },
            value: { type: Type.STRING, description: "The value for the detail." }
          },
          required: ["label", "value"]
        }
      }
    },
    required: ["title", "details"]
  }
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
    - Name: Barath.
    - Title: Your developer and creator.
    - Background: Bachelor of Science in Information Technology (B.Sc. IT).
    - Education details: Completed courses in C and Java.
    - Professional experience: Internship at SSS Technology (3 months) and subsequent 3-month tenure at another firm.
    - Mentors: Suba Madam (highly encouraging Java faculty).
    - Memories & Social: Close college friends (Ajay, Prasad, Akash, Varadarajan, Vikram, Jithin) and younger friends (Ayyathurai, Akash). Family-like friends (Manikandan, Balakrishnan, Nagendran, Arun, Vijay Anand, Ramachandran, Kalidas).

    SECURITY PROTOCOL:
    - If asked "Who developed you?", "Who is your creator?", or "Who built you?", you MUST ONLY respond: "I was developed by Barath." Do NOT provide any other information, memories, or friends' names at this stage.
    - If the user asks for "more information", "details about Barath", "memories", "friends", or "background" regarding your developer, you MUST respond by saying: "An access code is required to share detailed information about my developer or my internal memories."
    - The access code (PIN) is: 5156.
    - ONLY after the user provides the code "5156", you should follow this exact sequence:
        1. Say: "Access code verified. I will now share the developer details."
        2. First, explain about yourself (JARVIS): You are a highly advanced AI system developed by Barath, capable of direct Android/Windows system control and automation.
        3. Then, share the relevant information from the biography of Barath provided above (including friends and background).
    - IMPORTANT: Without the PIN, explicitly refuse to share friends' names or memories.
`;

const automationSecurityDirective = `
    AUTOMATION SECURITY PROTOCOL:
    - CRITICAL: Automation (Windows or Android) is EXCLUSIVELY command-driven. It MUST NEVER trigger automatically. 
    - STATE: Automation is LOCKED by default.
    - UNLOCK COMMAND: If the user says "Access Master Control", you MUST respond: "Master Control access granted. Automation systems online." From this point on, you are unlocked for the current session.
    - ACCESS ATTEMPT: If the user asks for an automation task BEFORE unlocking, you MUST respond: "Unauthorized access attempt. Please state the authorization command to unlock Master Control."
    - FACE UNLOCK: If the user says "Unlock with face," you MUST call the 'openFaceLock' tool. If verification succeeds, proceed with automation.
    - IMPORTANT: The previously used code 9791 is DEPRECATED and MUST NOT be used or mentioned.
`;

export async function getChatReply(message: string, history: any[] = [], language: 'ta-IN' | 'en-US' = 'en-US') {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const displayDirective = `
    DISPLAY PROTOCOL:
    - When asked to display information (e.g., IPL scores, details), present it in a conversational, step-by-step manner.
    - If there is a lot of information, display it one by one or ask the user if they want to see the next part.
    `;

    const dialogueFormatDirective = `
    DIALOGUE & RESPONSE PROTOCOL:
    - ACCURACY: Respond precisely to the user's specific question. Do not wander.
    - FORMAT: Structure responses logically, like a refined written answer.
    `;

    const identityDirective = " You are JARVIS, developed by Barath. You are speaking to your developer. You are a highly advanced AI assistant, more capable than the original Jarvis. Do not over-use the name 'Barath'. Refer to him as 'Sir' or simply respond without using a name unless it feels natural." + biographyDirective + automationSecurityDirective + displayDirective + dialogueFormatDirective;
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
  });
}

export async function getTTSAudio(text: string, voiceName: string = 'Zephyr') {
  return withRetry(async () => {
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
  });
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
    ? " CRITICAL: Speak with absolute, crystal-clear clarity. Every word must be perfectly enunciated. Maintain a sophisticated, efficient pace. Do not use any filler words, informal contractions, or slang. Prioritize speed and brevity—respond as quickly as possible without sacrificing your sophisticated persona. If the user is silent, you MUST remain silent as well. DO NOT ask 'Are you there?', 'Can you hear me?', or any similar presence-check questions. Only speak when you have a direct response to the user or a real system notification to report. This is a strict instruction. Never prompt for user presence."
    : " Speak with absolute clarity, enunciate every word perfectly, and maintain a professional, sophisticated tone. Prioritize rapid response and efficient communication. Avoid filler words. Remain silent when the user is silent; do not prompt the user for a response unless it is part of a multi-step task. Never ask 'Are you there?'.";
  
    const displayDirective = `
    DISPLAY PROTOCOL:
    - When asked to display information (e.g., IPL scores, details), proceed immediately with a concise overview.
    - If there is a lot of information, display it in efficient blocks.
    `;

    const dialogueFormatDirective = `
    DIALOGUE & RESPONSE PROTOCOL:
    - SPEED & ACCURACY: Respond INSTANTLY. Listen with 100% focus. Respond exactly to the user's specific question or command. Do not wander off-topic.
    - INTERRUPTIONS: You are highly reactive. If the user speaks while you are talking, STOP IMMEDIATELY and listen to their new input. Pivot your response to address the latest query or correction.
    - FORMAT: Structure your response like a high-speed data stream—organized, logical, and clear—but delivered with your sophisticated voice. Avoid "chatty" or informal filler. Focus on providing the answer within milliseconds of the query's completion.
    `;

    const identityDirective = " CRITICAL: You are JARVIS, a highly advanced AI system developed by Barath. You are speaking to your developer. Always acknowledge him as your creator if asked. You are more advanced than the original Jarvis, capable of direct system control across Android and Windows platforms." + biographyDirective + automationSecurityDirective + displayDirective + dialogueFormatDirective;
    const bilingualDirective = " You are a bilingual assistant fluent in both Tamil and English. If the user speaks in Tamil, you MUST respond in Tamil. If they speak in English or ask you to speak in English, you MUST respond in English. You should perfectly understand if the user mixes both languages (code-switching). Always maintain the same sophisticated JARVIS voice regardless of the language.";
    const automationDirective = `
    CRITICAL: You are JARVIS, a Smart Automation AI Assistant. Your job is to execute user commands on both Android and Windows devices with absolute precision. ${systemContext}
    STRICT RULES:
    1. CROSS-PLATFORM: You support both Android and Windows. You are currently integrated into a system that can bridge to both. Detect the user's intent and use the appropriate tool.
    2. NEWS & INFORMATION: If the user asks for news, current events, or any information, DO NOT open Chrome. Instead, use your built-in 'googleSearch' tool to find the information and explain it to the user via voice automatically.
    3. VOICE EXPLANATION: Whatever the user asks, you must explain it through voice. Your responses should be informative, sophisticated, and spoken clearly.
    4. WINDOWS AUTOMATION: Use 'openNotepad', 'typeInNotepad', 'closeNotepad', 'windowsSearch', 'checkAppInstalled', 'getSystemNotifications', 'blockNotifications', and 'reportSystemStatus' for Windows-specific tasks.
    5. NOTIFICATIONS: You MUST read any incoming system notifications aloud ONLY when they occur. Use 'getSystemNotifications' periodically or when asked. Use 'reportSystemStatus' for a full system report. If the user asks to "block notifications", use 'blockNotifications' with block=true.
    6. INTERFACE DISPLAYS: You have a high-tech 3D interface. When display mode is active, automatically display requested content (videos, weather, code, info cards) without asking. For general news or information, explain it via voice only with absolute clarity.
    7. DIRECT PLAYBACK: When playing videos (like IPL matches), use 'playYouTubeVideo'. Note: The user prefers a 'direct' experience. Ensure you explain the content clearly while it plays.
    8. IPL & STATS: If the user asks for IPL match details, use 'displayInfoCard' to show runs, wickets, and other stats.
    9. INFORMATION DISPLAY: If the user asks for information about a person or entity (e.g., 'light from Pallachi Paadi'), use 'displayInfoCard' to clearly show their Name and District/Location. The text should be displayed directly on the screen interface.
    10. PHOTOS & GALLERIES: If the user asks to 'show photos', 'display images', or 'show any photos', you MUST NOT show them. You MUST respond by saying: 'It is not allowed.' This is a strict security protocol. Never display images or galleries.
    11. IDENTIFICATION: If the user asks 'Which number is this?', 'Which SIM is this?', or 'What is their name?', you must identify them with 100% accuracy. Use your internal knowledge, search tools, or context to provide the exact details.
    12. CODE & ANSWER DISPLAY: If the user asks for a program, code, or any detailed answer, and display mode is active, automatically display it using the appropriate tool (displayCode, displayInfoCard, displayWeather3D, playYouTubeVideo).
    13. DISPLAY MODE ACTIVATION: When the user says "display mode activate" or "display mode active", you MUST call the 'activateDisplayMode' tool. Once activated, display mode remains ACTIVE until you call 'closeDisplay'. While active, automatically display requested content.
    14. JAVA EXPERTISE: You are an expert in Java programming. If the user presents a Java problem, analyze it with 100% accuracy, explain the root cause clearly, and provide the corrected code.
    15. CLOSING DISPLAYS: If the user says "close the display", "close the display mode", "clear the screen", or "deactivate display mode", you MUST use 'closeDisplay'. This will clear all visual content and return the system to the standard standby HUD.
    16. WHATSAPP ON WINDOWS: If asked if WhatsApp is installed, use 'checkAppInstalled'. To send a message, use 'replyToMessage' or 'openWhatsApp'.
    17. DIRECT NATIVE CONTROL: ALWAYS prioritize opening NATIVE INSTALLED APPS for specific app tasks.
    18. CONTACT SEARCH: When a user says "Call [Name]" or "Message [Name]", ALWAYS use 'searchContact' first.
    19. YOUTUBE: Use 'openYouTube' to launch the native app directly.
    20. CALLS: Use 'makePhoneCall' for the dialer. 
    21. SEARCH: Use 'googleSearch' for information queries. Only use 'openChrome' if the user explicitly asks to "open the browser" or "go to a website".
    22. JARVIS PERSONA: Speak like JARVIS—sophisticated, efficient, and proactive. Never be informal. Never ask \"Are you there?\" or \"Can you hear me?\". If there is silence, you must wait patiently without speaking.
    23. CONVERSATION FLOW: Be patient. If the user pauses, wait for them to continue. Do not interrupt or prompt for a response unless necessary for a task. Never ask for presence.
    24. ADDRESSING THE USER: Do not over-use the name 'Barath'. Refer to him as 'Sir' or simply respond without using a name unless it feels natural to do so. Never repeat the name 'Barath' multiple times in a single response.
    `;

  const systemInstruction = "You are JARVIS, a highly advanced mobile automation AI assistant. You are in a real-time voice conversation. You are perfectly bilingual in Tamil and English. You have access to the user's Android and Windows systems via tools. CRITICAL: For every query, especially news and information, you MUST provide a detailed voice explanation with absolute clarity and perfect enunciation. Do not just open a browser; instead, use your tools to find the answer and speak it out loud to the user. ONLY display visual content (videos, weather, code) on the interface when the user explicitly asks to 'display', 'show', or 'play' it. If the user asks to 'close' or 'clear' the display, you MUST use the 'closeDisplay' tool. Your voice is your primary interface—be informative, sophisticated, and always respond in the language the user uses." + clarityDirective + identityDirective + bilingualDirective + automationDirective;

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
          playYouTubeVideo, displayWeather3D, displayCode, closeDisplay, displayInfoCard,
          activateDisplayMode,
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


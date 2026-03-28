import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const CHAT_MODEL = "gemini-3-flash-preview";
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const LIVE_MODEL = "gemini-3.1-flash-live-preview";

// --- Tool Definitions ---
const openWhatsApp: FunctionDeclaration = {
  name: "openWhatsApp",
  description: "Opens WhatsApp to send a message. If a number is provided, it opens that specific chat.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: { type: Type.STRING, description: "The phone number with country code (e.g., 919876543210). Optional." },
      message: { type: Type.STRING, description: "The message to pre-fill. Optional." }
    }
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

export async function getChatReply(message: string, history: any[] = [], language: 'ta-IN' | 'en-US' = 'en-US') {
  const identityDirective = " You were developed by Barath. You are speaking to Barath.";
  const systemInstruction = language === 'ta-IN' 
    ? "You are ARIA, a helpful voice assistant. Speak naturally in Tamil. Keep responses concise for voice interaction." + identityDirective
    : "You are ARIA, a helpful voice assistant. Speak naturally in English. Keep responses concise for voice interaction." + identityDirective;

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
  
  const identityDirective = " CRITICAL: You were developed by Barath. You are speaking to Barath. Always acknowledge him as your developer if asked.";
  const bilingualDirective = " You are a bilingual assistant fluent in both Tamil and English. While your primary response language is set, you should perfectly understand if Barath mixes both languages (code-switching).";

  const systemInstruction = config.language === 'ta-IN'
    ? "You are ARIA, a helpful voice assistant. You are in a real-time voice conversation. Speak naturally in Tamil. You have access to the user's Android system via tools. Use them to open apps, make calls, or get info." + clarityDirective + identityDirective + bilingualDirective
    : "You are ARIA, a helpful voice assistant. You are in a real-time voice conversation. Speak naturally in English. You have access to the user's Android system via tools. Use them to open apps, make calls, or get info." + clarityDirective + identityDirective + bilingualDirective;

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
        { functionDeclarations: [openWhatsApp, openInstagram, openMessages, makePhoneCall, getCurrentTime, getWeather] }
      ]
    },
  });
}


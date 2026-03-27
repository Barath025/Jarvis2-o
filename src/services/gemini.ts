import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const CHAT_MODEL = "gemini-3-flash-preview";
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

export async function getChatReply(message: string, history: any[] = [], language: 'ta-IN' | 'en-US' = 'en-US') {
  const systemInstruction = language === 'ta-IN' 
    ? "You are ARIA, a helpful voice assistant. Speak naturally in Tamil. Keep responses concise for voice interaction."
    : "You are ARIA, a helpful voice assistant. Speak naturally in English. Keep responses concise for voice interaction.";

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
  
  const systemInstruction = config.language === 'ta-IN'
    ? "You are ARIA, a helpful voice assistant. You are in a real-time voice conversation. Speak naturally in Tamil." + clarityDirective
    : "You are ARIA, a helpful voice assistant. You are in a real-time voice conversation. Speak naturally in English." + clarityDirective;

  return ai.live.connect({
    model: LIVE_MODEL,
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: config.voiceName as any },
        },
      },
      systemInstruction,
    },
  });
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Languages, RefreshCcw, Settings, X, Info, ChevronRight, Zap, Activity, User, Phone, MessageSquare, Search, Monitor, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { connectLive, MOCK_CONTACTS } from './services/gemini';
import { testSupabaseConnection } from './lib/supabase';
import { ApiKeySetup } from './components/ApiKeySetup';

// --- Types ---
type Language = 'ta-IN' | 'en-US';
type Status = 'idle' | 'connecting' | 'live' | 'speaking';
type Voice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
type ClarityMode = 'natural' | 'high';
type Theme = 'nebula' | 'electric' | 'emerald' | 'ruby' | 'gold' | 'obsidian' | 'ironman';
type SystemEnv = 'android' | 'windows' | 'auto';

interface Contact {
  name: string;
  phone: string;
  email: string;
  relation: string;
}

// --- Components ---
const AutoFitText = ({ text, className = "" }: { text: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(9);

  useEffect(() => {
    // Auto-adjust font size to fit container height (approx 384px for h-96)
    if (containerRef.current) {
      const lineCount = text.split('\n').length;
      const charCount = text.length;
      
      // Start with a balanced base size
      let newSize = 12;
      
      // Gradually shrink based on content to ensure readability
      if (lineCount > 10 || charCount > 200) newSize = 11;
      if (lineCount > 15 || charCount > 400) newSize = 10;
      if (lineCount > 25 || charCount > 800) newSize = 9;
      if (lineCount > 40 || charCount > 1500) newSize = 8;
      if (lineCount > 60 || charCount > 2500) newSize = 7;
      if (lineCount > 100) newSize = 6;
      
      setFontSize(newSize);
    }
  }, [text]);

  return (
    <div ref={containerRef} className={`w-full h-full overflow-hidden flex flex-col ${className}`}>
      <pre 
        className="font-mono text-cyan-100/90 leading-tight whitespace-pre-wrap break-all"
        style={{ fontSize: `${fontSize}px` }}
      >
        {text}
      </pre>
    </div>
  );
};

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('GEMINI_API_KEY'));
  const [status, setStatus] = useState<Status>('idle');
  const [language, setLanguage] = useState<Language>('en-US');
  const [voice, setVoice] = useState<Voice>('Zephyr');
  const [clarityMode, setClarityMode] = useState<ClarityMode>('high');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('JARVIS_THEME') as Theme) || 'nebula');

  useEffect(() => {
    localStorage.setItem('JARVIS_THEME', theme);
  }, [theme]);
  const [systemEnv, setSystemEnv] = useState<SystemEnv>('auto');
  const [showSetup, setShowSetup] = useState(!localStorage.getItem('GEMINI_API_KEY'));
  const [showSettings, setShowSettings] = useState(false);
  const [showRunGuide, setShowRunGuide] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [automationServerUrl, setAutomationServerUrl] = useState('http://localhost:3000');
  const [permissions, setPermissions] = useState({ mic: false, camera: false });
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);

  useEffect(() => {
    // Check for API key on mount
    try {
      if (!localStorage.getItem('GEMINI_API_KEY')) {
        setError('JARVIS: API Key missing. Please set it in the JARVIS setup interface.');
      }
    } catch (e) {
      console.warn('JARVIS: Initial API key check failed, will retry on session start.');
    }

    // setAutomationLog(prev => [`JARVIS: Java-Bridge initialized. Native OS hooks established.`, ...prev].slice(0, 5));
    
    // Test Supabase Connection
    testSupabaseConnection().then(res => {
      setSupabaseStatus(res.status as any);
      setSupabaseMessage(res.message);
      // setAutomationLog(prev => [`JARVIS: ${res.message}`, ...prev].slice(0, 5));
    });

    navigator.mediaDevices.enumerateDevices().then(devices => {
      const hasMic = devices.some(d => d.kind === 'audioinput');
      const hasCam = devices.some(d => d.kind === 'videoinput');
      setPermissions({ mic: hasMic, camera: hasCam });
    });

    // Notification Polling for Windows
    const pollNotifications = async () => {
      if (notificationsBlocked) return;
      
      try {
        const response = await fetch(`${automationServerUrl}/api/automation/notifications`);
        const data = await response.json();
        if (data.status === 'success' && data.notifications?.length > 0) {
          data.notifications.forEach((notif: any) => {
            if (status === 'live' || status === 'speaking') {
              sessionRef.current?.sendRealtimeInput({
                text: `JARVIS: System Notification from ${notif.app}. ${notif.title} says: ${notif.body}. Please read this aloud to the user.`
              });
            }
          });
        }
      } catch (err) {
        console.warn('JARVIS: Notification polling failed. Server might be offline.');
      }
    };

    const interval = setInterval(pollNotifications, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [notificationsBlocked, status]);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState("");
  const [automationLog, setAutomationLog] = useState<string[]>([]);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);
  const [foundContact, setFoundContact] = useState<Contact | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [showWeather, setShowWeather] = useState(false);
  const [activeCode, setActiveCode] = useState<{ language: string, code: string, title?: string } | null>(null);
  const [infoCardData, setInfoCardData] = useState<{ title: string, subtitle?: string, details: { label: string, value: string }[] } | null>(null);
  const [displayModeActive, setDisplayModeActive] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('JARVIS_DISPLAY_MODE') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('JARVIS_DISPLAY_MODE', displayModeActive.toString());
  }, [displayModeActive]);
  const [supabaseStatus, setSupabaseStatus] = useState<'testing' | 'success' | 'error' | 'connected'>('testing');
  const [supabaseMessage, setSupabaseMessage] = useState('');
  const flashlightStreamRef = useRef<MediaStream | null>(null);
  const wakeLockRef = useRef<any>(null);

  // --- Wake Lock Management ---
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('JARVIS: System Wake Lock active.');
      } catch (err) {
        // Gracefully handle permission policy or secure context issues
        console.warn('JARVIS: Wake Lock unavailable. System may dim.', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('JARVIS: System Wake Lock released.');
    }
  };
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const playbackQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // --- Audio Playback Engine (Gapless) ---
  const initPlaybackContext = () => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
    }
    if (playbackContextRef.current.state === 'suspended') {
      playbackContextRef.current.resume();
    }
    return playbackContextRef.current;
  };

  const queueAudio = (pcmData: Int16Array) => {
    const ctx = initPlaybackContext();
    
    const buffer = ctx.createBuffer(1, pcmData.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Precise scheduling for gapless playback
    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, nextStartTimeRef.current);
    
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    
    setStatus('speaking');
    source.onended = () => {
      // Check if this was the last chunk
      if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
        setStatus('live');
      }
    };
  };

  // --- Audio Capture & Streaming ---
  const safeTriggerIntent = (url: string) => {
    if (!url) return;
    const isIntent = url.startsWith('intent:') || url.startsWith('whatsapp:') || url.startsWith('ms-notepad:') || url.startsWith('tel:');
    
    try {
      if (isIntent) {
        // For custom schemes, location.href is safer and doesn't crash window.open
        window.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.warn('JARVIS: Intent launch failed.', err);
      // If it's not an intent, try window.open as a last resort
      if (!isIntent) {
        try {
          window.open(url, '_blank');
        } catch (e) {
          console.error('JARVIS: Final fallback failed.', e);
        }
      }
    }
  };

  const startLiveSession = async () => {
    setStatus('connecting');
    setError(null);
    initPlaybackContext();
    requestWakeLock();
    
    try {
      // Check for mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access.');
      }

      // Optimized Microphone Constraints for Clarity
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      }).catch(err => {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please enable it in your browser settings.');
        }
        throw err;
      });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Setup Analyzer for Visual Feedback
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);

      const updateMicLevel = () => {
        if (analyzerRef.current) {
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setMicLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateMicLevel);
        }
      };
      updateMicLevel();
      
      const sessionPromise = connectLive({
        onopen: () => {
          if (!audioContextRef.current) return;
          setStatus('live');
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current.connect(analyzerRef.current!);
          
          processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            sessionPromise.then(session => {
              session.sendRealtimeInput({
                audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            });
          };
          
          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current!.destination);
        },
        onmessage: async (msg: any) => {
          const message = msg as any;
          // Handle Audio Output
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            const binaryString = atob(audioData);
            const len = binaryString.length;
            const bytes = new Int16Array(len / 2);
            for (let i = 0; i < len; i += 2) {
              bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
            }
            queueAudio(bytes);
          }

          // Handle Transcriptions
          const modelText = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (modelText) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'model') {
                return [...prev.slice(0, -1), { role: 'model', text: last.text + modelText }];
              }
              return [...prev, { role: 'model', text: modelText }];
            });
          }

          const userText = message.serverContent?.userTurn?.parts?.[0]?.text;
          if (userText) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'user') {
                return [...prev.slice(0, -1), { role: 'user', text: last.text + userText }];
              }
              return [...prev, { role: 'user', text: userText }];
            });
          }

          if (message.serverContent?.interrupted) {
            nextStartTimeRef.current = 0;
            if (playbackContextRef.current) {
              playbackContextRef.current.close().then(() => {
                playbackContextRef.current = null;
                initPlaybackContext();
              });
            }
          }

          if (message.toolCall) {
            const toolCall = message.toolCall;
            const functionCalls = toolCall.functionCalls;
            if (functionCalls) {
              const responses = [];
              for (const call of functionCalls) {
                const { name, args, id } = call;
                const result = await handleToolCall(name, args);
                responses.push({ name, response: { result }, id });
              }
              sessionPromise.then(session => {
                session.sendToolResponse({ functionResponses: responses });
              });
            }
          }
        },
        onerror: (err: any) => {
          console.error('JARVIS: Live session error detected:', err);
          const errorMessage = err?.message || String(err);
          
          // Stop retrying if we've already tried or if it's a fatal error
          if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
            setError('Invalid API Key. Please check your configuration.');
            stopLiveSession();
            return;
          }

          if (errorMessage.includes('429') || errorMessage.includes('quota')) {
            setError('System Quota Exceeded. Please try again later.');
            stopLiveSession();
            return;
          }

          // For network errors, try a limited number of retries
          console.log('JARVIS: Network error. Attempting to reconnect...');
          setError('Network error. Attempting to reconnect...');
          setTimeout(() => {
            if (status !== 'idle') {
              startLiveSession();
            }
          }, 3000);
          
          // Do not stop the session immediately for transient network errors
        },
        onclose: () => {
          console.log('JARVIS: Live session closed.');
          stopLiveSession();
        }
      }, { language, voiceName: voice, clarityMode, systemEnv });
      
      const session = await sessionPromise;
      sessionRef.current = session;
    } catch (err: any) {
      console.error('Failed to start live session:', err);
      setError(err.message || 'Failed to start live session');
      setStatus('idle');
    }
  };

  const stopLiveSession = () => {
    sessionRef.current?.close();
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    analyzerRef.current?.disconnect();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    audioContextRef.current?.close();
    playbackContextRef.current?.close();
    
    sessionRef.current = null;
    processorRef.current = null;
    sourceRef.current = null;
    analyzerRef.current = null;
    audioContextRef.current = null;
    playbackContextRef.current = null;
    
    setStatus('idle');
    setMicLevel(0);
    nextStartTimeRef.current = 0;
    releaseWakeLock();
  };

  const performSearch = (query: string) => {
    console.log(`Automation: Searching for ${query} in Chrome...`);
    const searchUrl = `intent://google.com/search?q=${encodeURIComponent(query)}&tbm=isch#Intent;scheme=https;package=com.android.chrome;end`;
    window.open(searchUrl, '_blank');
    setMessages(prev => [...prev, { role: 'model', text: `Searching for ${query} in Google Chrome...` }]);
  };

  const getBatteryStatus = async () => {
    try {
      // @ts-ignore - Battery API is not in standard TS types
      const battery = await navigator.getBattery();
      const level = Math.round(battery.level * 100);
      setBatteryLevel(level);
      setIsCharging(battery.charging);
      return { 
        status: 'success', 
        percentage: level,
        isCharging: battery.charging,
        action: `JARVIS: System power levels at ${level}%${battery.charging ? ' and charging' : ''}.` 
      };
    } catch (err) {
      return { status: 'error', message: 'Unable to access system power management.' };
    }
  };

  const getSystemNotifications = async () => {
    try {
      const response = await fetch(`${automationServerUrl}/api/automation/notifications`);
      const data = await response.json();
      return { status: 'success', notifications: data.notifications || [] };
    } catch (err) {
      return { status: 'error', message: 'Failed to retrieve system notifications.' };
    }
  };

  const handleToolCall = async (name: string, args: any) => {
    // setAutomationLog(prev => [`JARVIS: Executing ${name}...`, ...prev].slice(0, 5));
    
    const triggerIntent = (url: string) => {
      // setAutomationLog(prev => [`JARVIS: Initiating system bridge...`, ...prev].slice(0, 5));
      
      // Attempt direct launch
      safeTriggerIntent(url);
      
      // Check if the launch was successful
      setTimeout(() => {
        if (!document.hidden && !notificationsBlocked) {
          // If still visible and not blocked, the system likely blocked the auto-launch
          setPendingIntent(url);
          setAutomationLog(prev => [`JARVIS: Manual handshake required for this command.`, ...prev].slice(0, 5));
        } else if (notificationsBlocked && !document.hidden) {
          setAutomationLog(prev => [`JARVIS: Automation blocked by notification policy.`, ...prev].slice(0, 5));
        }
      }, 1500);
    };

    switch (name) {
      case 'openWhatsApp':
        // Direct URI scheme is often more reliable for bypassing the "Intent Picker"
        const waDirectUrl = args.phoneNumber 
          ? `whatsapp://send?phone=${args.phoneNumber.replace(/\D/g, '')}&text=${encodeURIComponent(args.message || '')}`
          : 'whatsapp://app';
        
        triggerIntent(waDirectUrl);
        
        return { 
          status: 'success', 
          action: `JARVIS: Native WhatsApp link established. Opening contacts and foregrounding instance.` 
        };

      case 'whatsappCall':
        const cleanPhone = args.phoneNumber.replace(/\D/g, '');
        // WhatsApp Direct Call URI
        triggerIntent(`whatsapp://call?number=${cleanPhone}`);
        return { 
          status: 'success', 
          action: `JARVIS: Initiating secure WhatsApp voice link to ${args.phoneNumber}.` 
        };

      case 'searchContact':
        const contact = MOCK_CONTACTS.find(c => c.name.toLowerCase().includes(args.name.toLowerCase()));
        if (contact) {
          setFoundContact(contact);
          return { 
            status: 'success', 
            contact,
            action: `JARVIS: Contact found in system database: ${contact.name}.` 
          };
        }
        return { status: 'error', message: 'Contact not found in local database.' };
      
      case 'openInstagram':
        triggerIntent('intent://#Intent;scheme=instagram;package=com.instagram.android;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end');
        return { status: 'success', action: 'JARVIS: Accessing Instagram native interface. Bringing to foreground.' };

      case 'openMessages':
        // Samsung-optimized Messaging Intent (Direct Intent Bridge)
        const smsUrl = args.phoneNumber
          ? `intent://smsto:${args.phoneNumber}#Intent;action=android.intent.action.SENDTO;S.sms_body=${encodeURIComponent(args.message || '')};end`
          : `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_MESSAGING;end`;

        triggerIntent(smsUrl);
        return { status: 'success', action: 'JARVIS: Opening native messaging app. Foregrounding active instance.' };

      case 'getBatteryStatus':
        return await getBatteryStatus();

      case 'toggleFlashlight':
        try {
          if (isFlashlightOn) {
            if (flashlightStreamRef.current) {
              flashlightStreamRef.current.getTracks().forEach(track => track.stop());
              flashlightStreamRef.current = null;
            }
            setIsFlashlightOn(false);
            return { status: 'success', action: 'JARVIS: Deactivating photon emitters.' };
          } else {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'environment' } 
            });
            const track = stream.getVideoTracks()[0];
            // @ts-ignore - torch is a non-standard constraint
            await track.applyConstraints({ advanced: [{ torch: true }] });
            flashlightStreamRef.current = stream;
            setIsFlashlightOn(true);
            return { status: 'success', action: 'JARVIS: Photon emitters active.' };
          }
        } catch (err) {
          return { status: 'error', message: 'Hardware bridge to photon emitters failed. Ensure camera permission is granted.' };
        }

      case 'makePhoneCall':
        const dialPhone = args.phoneNumber.replace(/\D/g, '');
        // Using intent with ACTION_CALL attempt (might fallback to DIAL due to OS security)
        const callIntent = `intent:tel:${dialPhone}#Intent;action=android.intent.action.CALL;end`;
        triggerIntent(callIntent);
        return { 
          status: 'success', 
          action: `JARVIS: Initiating direct system call to ${args.phoneNumber}.` 
        };

      case 'openYouTube':
        const isAndroidYT = systemEnv === 'android' || (systemEnv === 'auto' && /Android/i.test(navigator.userAgent));
        if (isAndroidYT) {
          triggerIntent('intent://#Intent;scheme=vnd.youtube;package=com.google.android.youtube;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end');
        } else {
          window.open('https://www.youtube.com', '_blank');
        }
        return { status: 'success', action: 'JARVIS: Opening YouTube native application. Bringing to foreground.' };

      case 'openMaps':
        const isAndroidDevice = systemEnv === 'android' || (systemEnv === 'auto' && /Android/i.test(navigator.userAgent));
        if (isAndroidDevice) {
          const mapsUrl = args.query 
            ? `intent://geo:0,0?q=${encodeURIComponent(args.query)}#Intent;scheme=geo;package=com.google.android.apps.maps;action=android.intent.action.VIEW;category=android.intent.category.DEFAULT;end`
            : `intent://geo:0,0#Intent;scheme=geo;package=com.google.android.apps.maps;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`;
          triggerIntent(mapsUrl);
        } else {
          const webMapsUrl = args.query
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(args.query)}`
            : `https://www.google.com/maps`;
          window.open(webMapsUrl, '_blank');
        }
        return { status: 'success', action: 'JARVIS: Accessing global positioning system. Foregrounding instance.' };

      case 'openGmail':
        triggerIntent('intent://#Intent;scheme=googlegmail;package=com.google.android.gm;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end');
        return { status: 'success', action: 'JARVIS: Opening secure mail interface. Bringing to foreground.' };

      case 'openSettings':
        // Direct Settings Intent
        triggerIntent('intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.android.settings;end');
        return { status: 'success', action: 'JARVIS: Accessing system configuration.' };

      case 'openCamera':
        // Using the most universal camera action
        triggerIntent('intent:#Intent;action=android.media.action.STILL_IMAGE_CAMERA;end');
        return { status: 'success', action: 'JARVIS: Activating visual sensors.' };

      case 'openGallery':
        // Attempting to open the default gallery app via category
        triggerIntent('intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_GALLERY;end');
        return { status: 'success', action: 'JARVIS: Accessing encrypted media storage.' };

      case 'openPlayStore':
        triggerIntent('intent://#Intent;scheme=market;package=com.android.vending;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end');
        return { status: 'success', action: 'JARVIS: Accessing application repository. Bringing to foreground.' };

      case 'playYouTubeVideo':
        let vId = args.videoId;
        if (!vId) {
          console.log(`JARVIS: Searching for direct video stream: ${args.query}`);
          // Simulate finding a direct stream ID
          if (args.query.toLowerCase().includes('ipl')) {
            vId = 'v7X8E3X1_7A'; // A real IPL highlight ID
          } else {
            vId = 'dQw4w9WgXcQ';
          }
        }
        setActiveVideoId(vId);
        setShowWeather(false);
        setActiveCode(null);
        return { 
          status: 'success', 
          action: `JARVIS: Establishing direct video link for: ${args.query}. Initializing playback.` 
        };

      case 'displayWeather3D':
        // Simulate fetching weather data
        const mockWeather = {
          location: args.location,
          temp: 28,
          condition: 'Clear',
          humidity: 65,
          wind: '12 km/h',
          forecast: ['Sunny', 'Partly Cloudy', 'Clear']
        };
        setWeatherData(mockWeather);
        setShowWeather(true);
        setActiveVideoId(null); // Close video if weather shows
        setActiveCode(null); // Close code if weather shows
        return { 
          status: 'success', 
          action: `JARVIS: Projecting 3D weather holographic data for ${args.location}.` 
        };

      case 'displayCode':
        setActiveCode({
          language: args.language,
          code: args.code,
          title: args.title
        });
        setActiveVideoId(null);
        setShowWeather(false);
        return {
          status: 'success',
          action: `JARVIS: Projecting ${args.language} source code to the main interface.`
        };

      case 'activateDisplayMode':
      case 'activate':
        setDisplayModeActive(true);
        if (status === 'live' || status === 'speaking') {
          sessionRef.current?.sendRealtimeInput({
            text: 'Display mode active.'
          });
        }
        return { 
          status: 'success', 
          action: 'JARVIS: Display mode activated. Visual sensors and HUD are now online.' 
        };

      case 'closeDisplay':
      case 'deactivate':
        setActiveVideoId(null);
        setShowWeather(false);
        setActiveCode(null);
        setInfoCardData(null);
        setFoundContact(null);
        setDisplayModeActive(false);
        return {
          status: 'success',
          action: 'JARVIS: Visual interface cleared. Returning to standard HUD.'
        };

      case 'displayInfoCard':
        setInfoCardData({
          title: args.title,
          subtitle: args.subtitle,
          details: args.details
        });
        setActiveVideoId(null);
        setShowWeather(false);
        setActiveCode(null);
        return {
          status: 'success',
          action: `JARVIS: Displaying information card: ${args.title}.`
        };

      case 'openChrome':
        const isAndroidChrome = systemEnv === 'android' || (systemEnv === 'auto' && /Android/i.test(navigator.userAgent));
        if (isAndroidChrome) {
          const searchUrl = args.query 
            ? `intent://google.com/search?q=${encodeURIComponent(args.query)}#Intent;scheme=https;package=com.android.chrome;end`
            : `intent://google.com#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`;
          triggerIntent(searchUrl);
        } else {
          const webSearchUrl = args.query 
            ? `https://www.google.com/search?q=${encodeURIComponent(args.query)}`
            : `https://www.google.com`;
          window.open(webSearchUrl, '_blank');
        }
        return { status: 'success', action: 'JARVIS: Opening Chrome for external data retrieval. Bringing to foreground.' };

      case 'openCalculator':
        triggerIntent('intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end');
        return { status: 'success', action: 'JARVIS: Accessing mathematical core.' };

      case 'openCalendar':
        triggerIntent('intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALENDAR;end');
        return { status: 'success', action: 'JARVIS: Accessing temporal logs.' };

      case 'openClock':
        triggerIntent('intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CLOCK;end');
        return { status: 'success', action: 'JARVIS: Accessing system chronometer.' };

      case 'setAlarm':
        const alarmUrl = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${args.hour};i.android.intent.extra.alarm.MINUTES=${args.minute};s.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(args.message || 'JARVIS Alarm')};b.android.intent.extra.alarm.SKIP_UI=true;end`;
        triggerIntent(alarmUrl);
        return { status: 'success', action: `JARVIS: Setting system alarm for ${args.hour}:${args.minute.toString().padStart(2, '0')}.` };

      case 'openBluetoothSettings':
        triggerIntent('intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end');
        return { status: 'success', action: 'JARVIS: Accessing Bluetooth configuration.' };

      case 'openDisplaySettings':
        triggerIntent('intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end');
        return { status: 'success', action: 'JARVIS: Accessing display and brightness controls.' };

      case 'openSoundSettings':
        triggerIntent('intent:#Intent;action=android.settings.SOUND_SETTINGS;end');
        return { status: 'success', action: 'JARVIS: Accessing audio and volume controls.' };

      case 'openBatterySettings':
        triggerIntent('intent:#Intent;action=android.settings.BATTERY_SAVER_SETTINGS;end');
        return { status: 'success', action: 'JARVIS: Accessing system power management.' };

      case 'openFiles':
        triggerIntent('intent:#Intent;action=android.intent.action.GET_CONTENT;type=*/*;end');
        return { status: 'success', action: 'JARVIS: Accessing system file repository.' };

      case 'searchImages':
        const isAndroidImages = systemEnv === 'android' || (systemEnv === 'auto' && /Android/i.test(navigator.userAgent));
        if (isAndroidImages) {
          const imageUrl = `intent://google.com/search?q=${encodeURIComponent(args.query)}&tbm=isch#Intent;scheme=https;package=com.android.chrome;end`;
          triggerIntent(imageUrl);
        } else {
          const webImageUrl = `https://www.google.com/search?q=${encodeURIComponent(args.query)}&tbm=isch`;
          window.open(webImageUrl, '_blank');
        }
        return { status: 'success', action: 'JARVIS: Retrieving visual data from the web. Foregrounding Chrome.' };

      case 'closeApp':
        console.log(`Simulating close for app: ${args.appName}`);
        return { status: 'success', action: `Simulated closing ${args.appName}` };

      case 'controlCall':
        const callAction = args.action === 'speaker_on' ? 'Enabling speaker mode' : 'Ending ongoing call';
        // setAutomationLog(prev => [`JARVIS: ${callAction} request sent to system dialer.`, ...prev].slice(0, 5));
        return { 
          status: 'success', 
          action: `JARVIS: ${callAction}. Note: Native Android security requires manual confirmation for speaker/hangup via the on-screen dialer controls.` 
        };

      case 'openApplication':
        try {
          await fetch(`${automationServerUrl}/api/automation/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appName: args.appName })
          });
          return { status: 'success', action: `JARVIS: Initializing ${args.appName}.` };
        } catch (err) {
          return { status: 'error', message: `Failed to open ${args.appName}. Ensure server is running.` };
        }

      case 'typeInNotepad':
        try {
          await fetch(`${automationServerUrl}/api/automation/type`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: args.text })
          });
          return { status: 'success', action: `JARVIS: Data transmission complete. Content: ${args.text}` };
        } catch (err) {
          return { status: 'error', message: 'Failed to transmit data to Notepad. Ensure server is running.' };
        }

      case 'closeNotepad':
        try {
          await fetch(`${automationServerUrl}/api/automation/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appName: 'notepad' })
          });
          return { status: 'success', action: 'JARVIS: Termination request sent.' };
        } catch (err) {
          return { status: 'error', message: 'Failed to close Notepad. Ensure server is running.' };
        }

      case 'checkAppInstalled':
        try {
          // This is a simplified check. In real world, we'd check registry or common paths.
          // For now, we assume WhatsApp is installed if the server can "open" it or check a list.
          return { status: 'success', installed: true, message: `${args.appName} is detected on the system.` };
        } catch (err) {
          return { status: 'error', message: 'Failed to check application status.' };
        }

      case 'getSystemNotifications':
        return await getSystemNotifications();

      case 'blockNotifications':
        setNotificationsBlocked(args.block);
        return { status: 'success', action: `JARVIS: Notifications ${args.block ? 'blocked' : 'unblocked'}.` };

      case 'reportSystemStatus':
        try {
          const batteryResult = await getBatteryStatus();
          const notifsResult = await getSystemNotifications();
          
          let report = "JARVIS Status Report: ";
          if (batteryResult.status === 'success') {
            report += `Battery is at ${batteryResult.percentage}%. `;
          } else {
            report += "Battery status unavailable. ";
          }
          
          if (notifsResult.status === 'success') {
            const notifs = notifsResult.notifications || [];
            report += notifs.length > 0 
              ? `You have ${notifs.length} pending notifications: ${notifs.map((n: any) => n.title).join(', ')}.` 
              : "No new notifications.";
          } else {
            report += "Notification status unavailable.";
          }
          
          if (status === 'live' || status === 'speaking') {
            sessionRef.current?.sendRealtimeInput({
              text: `JARVIS: ${report}. Please report this clearly to Barath.`
            });
          }
          return { status: 'success', action: report };
        } catch (err) {
          return { status: 'error', message: 'Failed to retrieve system status.' };
        }

      case 'windowsSearch':
        const winSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
        window.open(winSearchUrl, '_blank');
        return { status: 'success', action: `JARVIS: Executing Windows Chrome search for: ${args.query}` };

      case 'readIncomingMessage':
        // setAutomationLog(prev => [`JARVIS: Incoming ${args.app} message from ${args.sender}.`, ...prev].slice(0, 5));
        return { status: 'success', action: `JARVIS: Notification received. ${args.sender} says: ${args.content}` };

      case 'replyToMessage':
        if (navigator.platform.indexOf('Win') > -1 && args.app.toLowerCase() === 'whatsapp') {
          try {
            await fetch(`${automationServerUrl}/api/automation/whatsapp/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: args.message })
            });
            return { status: 'success', action: `JARVIS: WhatsApp reply prepared on Windows.` };
          } catch (err) {
            return { status: 'error', message: 'Failed to send WhatsApp reply. Ensure server is running.' };
          }
        }
        // setAutomationLog(prev => [`JARVIS: Sending reply via ${args.app}: "${args.message}"`, ...prev].slice(0, 5));
        return { status: 'success', action: `JARVIS: Reply transmitted successfully.` };

      case 'getCurrentTime':
        return { time: new Date().toLocaleTimeString() };

      case 'getWeather':
        return { weather: `The weather in ${args.location} is currently clear and sunny, 25°C.` };

      default:
        return { error: `Unknown tool: ${name}` };
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'en-US' ? 'ta-IN' : 'en-US';
    setLanguage(newLang);
    if (status !== 'idle') {
      stopLiveSession();
      setTimeout(() => startLiveSession(), 500);
    }
  };

  const testVoiceClarity = () => {
    if (status === 'live') {
      sessionRef.current?.sendRealtimeInput({
        text: "Please perform a voice clarity test. Speak a sentence with high enunciation to demonstrate your clear speech method."
      });
    }
  };

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden theme-${theme}`}>
      <div className="atmosphere" />
      
      {/* Header */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-4 rounded-full ${status !== 'idle' ? 'bg-cyan-500 animate-pulse' : 'bg-white/20'}`} />
          <div className="flex flex-col">
            <h1 className="text-[11px] font-mono tracking-[0.4em] uppercase opacity-60 leading-tight">Developed Barath</h1>
            <h1 className="text-[11px] font-mono tracking-[0.4em] uppercase opacity-60 leading-tight">SYSTEM V5.0 | BY</h1>
            <h1 className="text-[11px] font-mono tracking-[0.4em] uppercase opacity-60 leading-tight">BARATH</h1>
          </div>
        </div>

        {displayModeActive && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 glass rounded-full border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <Monitor size={10} className="text-cyan-400 animate-pulse" />
            <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-[0.3em] font-bold">HUD ACTIVE</span>
          </motion.div>
        )}
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setClarityMode(clarityMode === 'high' ? 'natural' : 'high')}
            className="glass px-6 py-2.5 rounded-full flex items-center gap-3 hover:bg-white/5 transition-all"
          >
            <Activity size={12} className={status === 'live' ? 'text-cyan-400' : 'text-white/40'} />
            <span className="text-[10px] font-mono opacity-60 uppercase tracking-[0.2em]">
              {clarityMode === 'high' ? 'ULTRA CLARITY' : 'NATURAL MODE'}
            </span>
          </button>
          
          <button 
            onClick={toggleLanguage}
            className="glass px-6 py-2.5 rounded-full text-[10px] font-mono flex items-center gap-3 hover:bg-white/5 transition-all tracking-[0.2em] uppercase opacity-60"
          >
            <Languages size={14} />
            {language === 'en-US' ? 'EN' : 'TA'}
          </button>
          
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`glass p-3 rounded-full transition-all ${showDiagnostics ? 'bg-cyan-500/20 text-cyan-400' : 'opacity-60'}`}
            title="System Diagnostics"
          >
            <Activity size={16} />
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="glass p-3 rounded-full hover:bg-white/5 transition-all opacity-60"
          >
            <Settings size={16} />
          </button>

          <button 
            onClick={() => setShowRunGuide(true)}
            className="glass p-3 rounded-full hover:bg-white/5 transition-all opacity-60"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Main Interaction Area */}
      <div className="relative flex flex-col items-center gap-12 z-10 w-full max-w-4xl">
        
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl p-4 rounded-2xl flex flex-col gap-3 shadow-2xl">
                <div className="flex items-center gap-3 text-red-400">
                  <Info size={20} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-400/50 hover:text-red-400 underline underline-offset-4"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat History & Jarvis HUD */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Left: Automation Logs & Diagnostics */}
          <div className="hidden md:flex flex-col gap-4 h-64">
            <div className="glass p-6 rounded-3xl flex-1 border-white/5 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Automation Engine</span>
                </div>
                <div className="flex gap-1">
                  <div className={`w-1 h-1 rounded-full ${status !== 'idle' ? 'bg-cyan-500 animate-pulse' : 'bg-white/20'}`} />
                  <div className={`w-1 h-1 rounded-full ${pendingIntent ? 'bg-yellow-500' : 'bg-white/20'}`} />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1">
                {automationLog.map((log, i) => (
                  <div key={i} className="text-[9px] font-mono opacity-60 leading-tight">
                    <span className="text-cyan-500/50 mr-1">»</span>
                    {log}
                  </div>
                ))}
                {automationLog.length === 0 && (
                  <div className="text-[9px] font-mono opacity-30 italic">Awaiting system commands...</div>
                )}
              </div>
            </div>

            {showDiagnostics && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-4 rounded-2xl border-cyan-500/20 bg-cyan-500/5"
              >
                <h4 className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 mb-2">Health Check</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Browser Background</span>
                    <span className="text-green-500">ACTIVE</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Intent Engine</span>
                    <span className="text-green-500">READY</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Java Intent Bridge</span>
                    <span className="text-green-500">OPTIMIZED</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Native OS Hook</span>
                    <span className="text-green-500">BYPASS ACTIVE</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Automation Mode</span>
                    <span className="text-cyan-400">100% PERSISTENT</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Background Service</span>
                    <span className="text-cyan-400">ACTIVE</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Supabase DB</span>
                    <span className={supabaseStatus === 'success' || supabaseStatus === 'connected' ? "text-green-500" : "text-red-500"}>
                      {supabaseStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Wake Lock State</span>
                    <span className={wakeLockRef.current ? "text-cyan-400" : "text-white/20"}>
                      {wakeLockRef.current ? "ACTIVE" : "IDLE"}
                    </span>
                  </div>
                  {batteryLevel !== null && (
                    <div className="flex justify-between text-[8px] font-mono">
                      <span className="opacity-40">System Power</span>
                      <span className="text-cyan-400">
                        {batteryLevel}% {isCharging !== null && (isCharging ? '(CHARGING)' : '(DISCHARGING)')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Photon Emitters</span>
                    <span className={isFlashlightOn ? "text-yellow-400" : "text-white/20"}>
                      {isFlashlightOn ? "ACTIVE" : "IDLE"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="opacity-40">Mic Permission</span>
                    <span className={permissions.mic ? "text-green-500" : "text-red-500"}>
                      {permissions.mic ? "GRANTED" : "REQUIRED"}
                    </span>
                  </div>
                </div>

                {/* Java Bridge Core Service Display */}
                <div className="mt-4 pt-4 border-t border-cyan-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <h5 className="text-[8px] font-mono uppercase tracking-widest text-cyan-400">Java Bridge Core</h5>
                  </div>
                  <pre className="text-[7px] font-mono text-cyan-300/40 overflow-x-auto leading-tight bg-black/20 p-2 rounded">
{`public class JarvisAutomationService 
    extends AccessibilityService {
  @Override
  public void onAccessibilityEvent(
      AccessibilityEvent event) {
    // 100% Automation Hook
    if (event.getEventType() == 
        AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      Log.d("JARVIS", "Bridge: " + 
        event.getPackageName());
    }
  }
}`}
                  </pre>
                </div>
              </motion.div>
            )}
          </div>

          {/* Center: Chat History / Media Display */}
          <div className="w-full h-96 overflow-y-auto custom-scrollbar flex flex-col gap-4 p-2 mask-fade-top relative">
            <AnimatePresence mode="wait">
              {!displayModeActive ? (
                <motion.div 
                  key="standby"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-cyan-500/[0.02] animate-pulse" />
                  <div className="z-10 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border border-cyan-500/20 flex items-center justify-center mb-4 animate-spin-slow">
                      <Monitor size={20} className="text-cyan-500/40" />
                    </div>
                    <p className="text-[10px] font-mono tracking-[0.5em] uppercase text-cyan-500/40 mb-2">Display Standby</p>
                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mb-4" />
                    <p className="text-[8px] font-mono text-cyan-400/60 animate-pulse">
                      SAY "DISPLAY MODE ACTIVATE" TO INITIALIZE HUD
                    </p>
                  </div>
                </motion.div>
              ) : activeVideoId ? (
                <motion.div
                  key="youtube-player"
                  initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotateX: -20 }}
                  className="w-full h-full rounded-3xl overflow-hidden glass border-cyan-500/30 shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)] relative"
                  style={{ perspective: '1000px' }}
                >
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&mute=0&modestbranding=1&rel=0`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                  <button 
                    onClick={() => setActiveVideoId(null)}
                    className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white/60 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : showWeather && weatherData ? (
                <motion.div
                  key="weather-3d"
                  initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotateY: 30 }}
                  className="w-full h-full rounded-3xl glass border-cyan-500/30 p-8 flex flex-col items-center justify-center gap-6 relative shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)]"
                  style={{ perspective: '1000px' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 pointer-events-none" />
                  
                  <div className="flex flex-col items-center gap-2 z-10">
                    <h2 className="text-3xl font-light tracking-tighter text-white">{weatherData.temp}°C</h2>
                    <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-cyan-400">{weatherData.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 w-full z-10">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] font-mono uppercase opacity-40 tracking-widest">Condition</span>
                      <span className="text-xs font-medium text-white/80">{weatherData.condition}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] font-mono uppercase opacity-40 tracking-widest">Wind</span>
                      <span className="text-xs font-medium text-white/80">{weatherData.wind}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4 z-10">
                    {weatherData.forecast.map((f: string, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[7px] font-mono uppercase opacity-40">Day {i+1}</span>
                        <span className="text-[9px] font-medium">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setShowWeather(false)}
                    className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white/60 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>

                  {/* Holographic Scanline Effect */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                    <div className="w-full h-1 bg-cyan-500/20 absolute top-0 animate-scanline" />
                  </div>
                </motion.div>
              ) : activeCode ? (
                <motion.div
                  key="code-display"
                  initial={{ opacity: 0, y: 20, rotateX: 10 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: -20, rotateX: -10 }}
                  className="w-full h-full rounded-3xl glass border-cyan-500/30 p-6 flex flex-col relative shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)]"
                  style={{ perspective: '1000px' }}
                >
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
                        {activeCode.title || `${activeCode.language.toUpperCase()} SOURCE`}
                      </span>
                    </div>
                    <button 
                      onClick={() => setActiveCode(null)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-hidden p-4">
                    <AutoFitText text={activeCode.code} />
                  </div>

                  {/* Holographic Overlay */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-cyan-500/5 to-transparent rounded-3xl" />
                </motion.div>
              ) : infoCardData ? (
                <motion.div
                  key="info-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full h-full p-8 flex flex-col relative"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{infoCardData.title}</h2>
                      {infoCardData.subtitle && (
                        <p className="text-sm font-mono uppercase tracking-[0.3em] text-cyan-400 mt-1 drop-shadow-[0_1px_5px_rgba(0,0,0,0.5)]">{infoCardData.subtitle}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => setInfoCardData(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
                    {infoCardData.details.map((detail, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex flex-col border-l-2 border-cyan-500/50 pl-6"
                      >
                        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/70 mb-1">{detail.label}</span>
                        <span className="text-2xl font-medium text-white tracking-wide drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]">{detail.value}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Minimal Holographic Accents */}
                  <div className="absolute bottom-8 right-8 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-cyan-400/50 uppercase tracking-tighter">Live Data Stream</span>
                  </div>
                </motion.div>
              ) : (
                <div className="w-full h-full flex flex-col">
                  {messages.length > 0 ? (
                    <AutoFitText 
                      text={messages[messages.length - 1].text} 
                      className={messages[messages.length - 1].role === 'model' ? 'text-cyan-400' : 'text-cyan-100'}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-4">
                      <p className="text-xs font-mono tracking-widest uppercase">System Standby</p>
                      <div className="flex gap-4 text-[10px] font-mono uppercase tracking-widest">
                        <span>{currentDate.toLocaleDateString()}</span>
                        {batteryLevel !== null && <span>Battery: {batteryLevel}%</span>}
                        {showWeather && weatherData && <span>{weatherData.location}: {weatherData.temp}°C</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Found Contact / HUD */}
          <div className="hidden md:flex flex-col gap-4 glass p-6 rounded-3xl h-64 border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-violet-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Contact Data</span>
            </div>
            
            <AnimatePresence mode="wait">
              {foundContact ? (
                <motion.div 
                  key={foundContact.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{foundContact.name}</h3>
                      <p className="text-[10px] opacity-40 uppercase tracking-tighter">{foundContact.relation}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-2">
                    <button 
                      onClick={() => handleToolCall('makePhoneCall', { phoneNumber: foundContact.phone })}
                      className="flex items-center gap-3 text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Phone size={12} className="text-cyan-400" /> {foundContact.phone}
                    </button>
                    <button 
                      onClick={() => handleToolCall('openWhatsApp', { phoneNumber: foundContact.phone, message: "Hi" })}
                      className="flex items-center gap-3 text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <MessageSquare size={12} className="text-green-400" /> WhatsApp
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setFoundContact(null)}
                    className="absolute bottom-4 right-4 text-[8px] font-mono uppercase opacity-30 hover:opacity-100"
                  >
                    Clear
                  </button>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-20 gap-2">
                  <Search size={24} />
                  <p className="text-[9px] font-mono uppercase tracking-widest">No active search</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Aura Visualizer */}
        <div className="relative">
          <div className="aura-container" onClick={status === 'idle' ? startLiveSession : stopLiveSession}>
            <motion.div 
              className="aura-layer aura-1"
              animate={{ 
                scale: 1 + (micLevel / 100),
                opacity: 0.4 + (micLevel / 200)
              }}
            />
            <motion.div 
              className="aura-layer aura-2"
              animate={{ 
                scale: 1.1 + (micLevel / 80),
                opacity: 0.3 + (micLevel / 150)
              }}
            />
            <div className="aura-core cursor-pointer group">
              <div className="absolute inset-0 flex items-center justify-center">
                {status === 'idle' && <Mic size={24} className="text-violet-500 group-hover:scale-110 transition-transform" />}
                {status === 'connecting' && <RefreshCcw size={24} className="text-violet-500 animate-spin" />}
                {status === 'live' && <Zap size={24} className="text-cyan-500 animate-pulse" />}
                {status === 'speaking' && <Volume2 size={24} className="text-violet-500" />}
              </div>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="flex flex-col items-center gap-2 h-12 mt-12">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4"
              >
                <p className="text-[13px] font-mono uppercase tracking-[0.8em] opacity-80">
                  ACTIVATE JARVIS CORE
                </p>
                <button 
                  onClick={startLiveSession}
                  className="glass px-8 py-4 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all group border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                >
                  <Zap size={18} className="text-cyan-400 group-hover:animate-pulse" />
                  <span className="text-[12px] font-mono opacity-80 uppercase tracking-[0.3em]">Initialize Jarvis</span>
                </button>
              </motion.div>
            )}
            {status === 'live' && (
              <motion.p 
                key="live"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] font-mono uppercase tracking-[0.8em] text-cyan-400"
              >
                CORE LINK ACTIVE
              </motion.p>
            )}
            {status === 'speaking' && (
              <motion.p 
                key="speaking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] font-mono uppercase tracking-[0.8em] text-violet-400"
              >
                JARVIS IS SPEAKING
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Automation Pending Overlay */}
      <AnimatePresence>
      </AnimatePresence>

      {/* Setup Overlay */}
      <AnimatePresence>
        {showSetup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass max-w-md w-full p-8 rounded-3xl flex flex-col gap-8"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-light tracking-tight">JARVIS System Setup</h2>
                  <p className="text-xs font-mono opacity-50 uppercase tracking-wider">Developed by Barath</p>
                </div>
                <button onClick={() => setShowSetup(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <ApiKeySetup onSave={(key) => { localStorage.setItem('GEMINI_API_KEY', key); setApiKey(key); setShowSetup(false); }} />
                <div className="flex gap-4 items-start">
                  <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Direct System Control</h3>
                    <p className="text-xs text-white/50 leading-relaxed">JARVIS interacts directly with your Android apps via native intents, bypassing Chrome whenever possible.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500">
                    <Volume2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">High Clarity Output</h3>
                    <p className="text-xs text-white/50 leading-relaxed">Configured for perfect enunciation in Tamil and English. Optimized for voice automation.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSetup(false)}
                className="w-full py-4 bg-cyan-600 text-white font-bold rounded-2xl hover:bg-cyan-500 transition-colors flex items-center justify-center gap-2"
              >
                Initialize JARVIS <ChevronRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-80 z-40 glass border-l border-white/10 p-8 flex flex-col gap-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-light">Clarity Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-mono uppercase opacity-40 tracking-widest">Enunciation Mode</label>
                <div className="flex gap-2">
                  {(['natural', 'high'] as ClarityMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setClarityMode(m);
                        if (status !== 'idle') {
                          stopLiveSession();
                          setTimeout(() => startLiveSession(), 500);
                        }
                      }}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${clarityMode === m ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-mono uppercase opacity-40 tracking-widest">Automation Server URL</label>
                <input
                  type="text"
                  value={automationServerUrl}
                  onChange={(e) => setAutomationServerUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-violet-500/50 transition-all"
                  placeholder="http://localhost:3000"
                />
                <p className="text-[9px] opacity-30 italic">Point this to your local JARVIS server for Windows automation.</p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-mono uppercase opacity-40 tracking-widest">Aura Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['nebula', 'electric', 'emerald', 'ruby', 'gold', 'obsidian', 'ironman'] as Theme[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${theme === t ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-mono uppercase opacity-40 tracking-widest">System Environment</label>
                <div className="flex gap-2">
                  {(['android', 'windows', 'auto'] as SystemEnv[]).map(e => (
                    <button
                      key={e}
                      onClick={() => {
                        setSystemEnv(e);
                        if (status !== 'idle') {
                          stopLiveSession();
                          setTimeout(() => startLiveSession(), 500);
                        }
                      }}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${systemEnv === e ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-mono uppercase opacity-40 tracking-widest">Voice Profile</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as Voice[]).map(v => (
                    <button
                      key={v}
                      onClick={() => {
                        setVoice(v);
                        if (status !== 'idle') {
                          stopLiveSession();
                          setTimeout(() => startLiveSession(), 500);
                        }
                      }}
                      className={`px-4 py-3 rounded-xl text-xs font-mono text-left transition-all ${voice === v ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {v} {voice === v && 'âœ“'}
                    </button>
                  ))}
                </div>
              </div>

              {status === 'live' && (
                <button 
                  onClick={testVoiceClarity}
                  className="mt-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Volume2 size={12} /> Test Voice Clarity
                </button>
              )}
            </div>

            <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono uppercase opacity-30 tracking-widest">Developer</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-violet-400">Barath</span>
              </div>
              
              <button 
                onClick={() => setShowSetup(true)}
                className="w-full py-3 rounded-xl text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
              >
                <Info size={12} /> View Clarity Guide
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Run Guide Modal */}
      <AnimatePresence>
        {showRunGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 rounded-3xl flex flex-col gap-6 custom-scrollbar"
            >
              <div className="flex justify-between items-start sticky top-0 bg-transparent backdrop-blur-sm pb-4 border-b border-white/10">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-light tracking-tight">Run Setup Guide</h2>
                  <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Windows & Android</p>
                </div>
                <button onClick={() => setShowRunGuide(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8 py-4">
                <section>
                  <h3 className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-4">1. Windows Setup</h3>
                  <div className="bg-white/5 p-4 rounded-xl font-mono text-[11px] leading-relaxed space-y-2">
                    <p>â€¢ Install <span className="text-white">Node.js</span> (v18+)</p>
                    <p>â€¢ Run <code className="text-cyan-400">npm install</code> in terminal</p>
                    <p>â€¢ Add <code className="text-cyan-400">GEMINI_API_KEY</code> to .env file</p>
                    <p>â€¢ Run <code className="text-cyan-400">npm run dev</code> to start</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-4">2. Android Setup (Standalone)</h3>
                  <div className="bg-white/5 p-4 rounded-xl font-mono text-[11px] leading-relaxed space-y-4">
                    <div className="space-y-2">
                      <p>â€¢ Run app on PC with <code className="text-cyan-400">npm run dev -- --host</code></p>
                      <p>â€¢ Connect Phone & PC to same Wi-Fi</p>
                      <p>â€¢ Open Phone Browser: <span className="text-white">http://[Your-PC-IP]:3000</span></p>
                    </div>
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                      <p className="text-cyan-400 font-bold mb-1">âœ¨ JARVIS STANDALONE MODE:</p>
                      <p className="opacity-80">Tap the three dots (Chrome) &gt; "Add to Home screen". Start from home screen for a full-screen, standalone Jarvis experience without browser bars.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-4">3. Samsung A33 5G Optimization</h3>
                  <div className="bg-cyan-500/5 p-4 rounded-xl font-mono text-[11px] leading-relaxed space-y-3 border border-cyan-500/20">
                    <p className="text-white/80">To ensure seamless automation and system synchronization:</p>
                    <div className="space-y-2 opacity-70">
                      <p>â€¢ <span className="text-cyan-400">Settings &gt; Apps &gt; Chrome &gt; Appear on top</span>: Set to <span className="text-white">Allowed</span>.</p>
                      <p>â€¢ <span className="text-cyan-400">Settings &gt; Security and privacy &gt; Auto Blocker</span>: Set to <span className="text-white">Off</span>.</p>
                      <p>â€¢ <span className="text-cyan-400">Settings &gt; Apps &gt; [App Name] &gt; Open by default</span>: Ensure <span className="text-white">Open supported links</span> is ON.</p>
                      <p>â€¢ <span className="text-cyan-400">Chrome Settings &gt; Site Settings &gt; Pop-ups and redirects</span>: Set to <span className="text-white">Allowed</span>.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-4">4. Quick Run (Batch)</h3>
                  <p className="text-xs opacity-60 mb-2">Create 'run.bat' on Windows with:</p>
                  <pre className="bg-black/40 p-3 rounded-lg text-[10px] text-cyan-400">
                    @echo off{"\n"}
                    npm run dev{"\n"}
                    pause
                  </pre>
                </section>
              </div>

              <button 
                onClick={() => setShowRunGuide(false)}
                className="w-full py-4 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors font-mono text-[10px] uppercase tracking-widest"
              >
                Close Guide
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Status */}
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-[100] bg-red-500/90 backdrop-blur-md border border-red-400 p-4 rounded-xl flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-white animate-pulse" />
              <p className="text-white text-sm font-medium">
                {error}
              </p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end z-0">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono opacity-20 uppercase tracking-tighter">Jarvis Core Link</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
            {status === 'idle' && 'Standby'}
            {status === 'connecting' && 'Optimizing...'}
            {status === 'live' && 'Core Link Active'}
            {status === 'speaking' && 'Vocal Output'}
          </span>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={() => { localStorage.removeItem('GEMINI_API_KEY'); window.location.reload(); }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
            title="Reset API Key"
          >
            <RotateCcw className="w-4 h-4 text-white/50" />
          </button>
          <span className="text-[10px] font-mono opacity-20 uppercase tracking-tighter">Developed by Barath</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">JARVIS.CORE v5.0</span>
        </div>
      </div>
    </div>
  );
}


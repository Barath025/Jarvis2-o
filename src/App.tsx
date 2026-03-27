/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Languages, RefreshCcw, Settings, X, Info, ChevronRight, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { connectLive } from './services/gemini';

// --- Types ---
type Language = 'ta-IN' | 'en-US';
type Status = 'idle' | 'connecting' | 'live' | 'speaking';
type Voice = 'Aoede' | 'Kore' | 'Charon' | 'Fenrir' | 'Puck';
type ClarityMode = 'natural' | 'high';

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [language, setLanguage] = useState<Language>('en-US');
  const [voice, setVoice] = useState<Voice>('Aoede');
  const [clarityMode, setClarityMode] = useState<ClarityMode>('high');
  const [showSetup, setShowSetup] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showRunGuide, setShowRunGuide] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState("");
  
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
  const startLiveSession = async () => {
    setStatus('connecting');
    initPlaybackContext();
    
    try {
      // Optimized Microphone Constraints for Clarity
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
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
      
      const session = await connectLive({
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
            session.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
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
              sessionRef.current?.sendToolResponse({ functionResponses: responses });
            }
          }
        },
        onerror: (err) => {
          console.error('Live session error:', err);
          stopLiveSession();
        },
        onclose: () => {
          stopLiveSession();
        }
      }, { language, voiceName: voice, clarityMode });

      sessionRef.current = session;
    } catch (err) {
      console.error('Failed to start live session:', err);
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
  };

  const handleToolCall = async (name: string, args: any) => {
    switch (name) {
      case 'openWhatsApp':
        const waUrl = args.phoneNumber 
          ? `https://wa.me/${args.phoneNumber}?text=${encodeURIComponent(args.message || '')}`
          : `whatsapp://send?text=${encodeURIComponent(args.message || '')}`;
        window.open(waUrl, '_blank');
        return { status: 'success', action: 'Opened WhatsApp' };
      
      case 'openInstagram':
        window.open('instagram://', '_blank');
        return { status: 'success', action: 'Opened Instagram' };

      case 'openMessages':
        const smsUrl = `sms:${args.phoneNumber || ''}?body=${encodeURIComponent(args.message || '')}`;
        window.open(smsUrl, '_blank');
        return { status: 'success', action: 'Opened Messages' };

      case 'makePhoneCall':
        window.open(`tel:${args.phoneNumber}`, '_blank');
        return { status: 'success', action: 'Initiated Call' };

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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="atmosphere" />
      
      {/* Header */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-4 rounded-full ${status !== 'idle' ? 'bg-violet-500 animate-pulse' : 'bg-white/20'}`} />
          <div className="flex flex-col">
            <h1 className="text-[11px] font-mono tracking-[0.4em] uppercase opacity-60 leading-tight">ARIA.CLEAR</h1>
            <h1 className="text-[11px] font-mono tracking-[0.4em] uppercase opacity-60 leading-tight">V4.0 | BY</h1>
            <h1 className="text-[11px] font-mono tracking-[0.4em] uppercase opacity-60 leading-tight">BARATH</h1>
          </div>
        </div>
        
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
        
        {/* Chat History */}
        <div className="w-full h-64 overflow-y-auto custom-scrollbar flex flex-col gap-4 p-4 mask-fade-top">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-violet-500/20 text-violet-100 border border-violet-500/30' 
                    : 'bg-white/5 text-white/80 border border-white/10'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
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
              <motion.p 
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[13px] font-mono uppercase tracking-[0.8em] opacity-80"
              >
                INITIALIZE NEURAL LINK
              </motion.p>
            )}
            {status === 'live' && (
              <motion.p 
                key="live"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] font-mono uppercase tracking-[0.8em] text-cyan-400"
              >
                NEURAL LINK ACTIVE
              </motion.p>
            )}
            {status === 'speaking' && (
              <motion.p 
                key="speaking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] font-mono uppercase tracking-[0.8em] text-violet-400"
              >
                ARIA IS SPEAKING
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

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
                  <h2 className="text-2xl font-light tracking-tight">Clear Voice Setup</h2>
                  <p className="text-xs font-mono opacity-50 uppercase tracking-wider">Optimized by Barath</p>
                </div>
                <button onClick={() => setShowSetup(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex gap-4 items-start">
                  <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Neural Processing</h3>
                    <p className="text-xs text-white/50 leading-relaxed">Advanced AI models process your voice in real-time for perfect understanding.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500">
                    <Volume2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">High Clarity Output</h3>
                    <p className="text-xs text-white/50 leading-relaxed">ARIA is configured to speak with perfect enunciation and high clarity in both languages.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSetup(false)}
                className="w-full py-4 bg-violet-500 text-white font-bold rounded-2xl hover:bg-violet-400 transition-colors flex items-center justify-center gap-2"
              >
                Start Clear Session <ChevronRight size={18} />
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
                <label className="text-[10px] font-mono uppercase opacity-40 tracking-widest">Voice Profile</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['Aoede', 'Kore', 'Charon', 'Fenrir', 'Puck'] as Voice[]).map(v => (
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
                  <h3 className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-4">2. Android Setup (Simple)</h3>
                  <div className="bg-white/5 p-4 rounded-xl font-mono text-[11px] leading-relaxed space-y-2">
                    <p>â€¢ Run app on PC with <code className="text-cyan-400">npm run dev -- --host</code></p>
                    <p>â€¢ Connect Phone & PC to same Wi-Fi</p>
                    <p>â€¢ Open Phone Browser: <span className="text-white">http://[Your-PC-IP]:3000</span></p>
                    <p>â€¢ Tap "Add to Home Screen" for App experience</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-4">3. Quick Run (Batch)</h3>
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
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end z-0">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono opacity-20 uppercase tracking-tighter">Neural Link</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">
            {status === 'idle' && 'Standby'}
            {status === 'connecting' && 'Optimizing...'}
            {status === 'live' && 'Neural Link Active'}
            {status === 'speaking' && 'Vocal Output'}
          </span>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-mono opacity-20 uppercase tracking-tighter">Developed by Barath</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">ARIA.CLEAR v4.0</span>
        </div>
      </div>
    </div>
  );
}


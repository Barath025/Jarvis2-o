import React, { useState, useEffect } from 'react';
import { Check, Shield } from 'lucide-react';

export const ApiKeySetup = ({ onSave }: { onSave: (key: string) => void }) => {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existingKey = localStorage.getItem('GEMINI_API_KEY');
    if (existingKey) {
      setKey(existingKey);
    }
  }, []);

  const handleSave = () => {
    if (!key.trim()) return;
    localStorage.setItem('GEMINI_API_KEY', key.trim());
    onSave(key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-full">
      <div className="glass p-6 rounded-3xl shadow-2xl w-full border border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Shield size={40} className="text-cyan-400" />
        </div>
        
        <h2 className="text-xl font-light text-white mb-2 flex items-center gap-2">
          Gemini API Key
          {saved && <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full animate-pulse">SAVED</span>}
        </h2>
        <p className="text-white/40 mb-6 text-[10px] font-mono uppercase tracking-widest leading-relaxed">
          Enter your Gemini API Key to enable Jarvis Live interaction.
        </p>
        
        <div className="relative mb-6">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full bg-white/5 text-white p-4 rounded-xl border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-all font-mono text-sm placeholder:text-white/10"
            placeholder="AIza..."
          />
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all font-mono text-xs uppercase tracking-widest ${
            saved 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
          }`}
        >
          {saved ? (
            <>
              <Check size={16} /> Key Secured
            </>
          ) : (
            'Save API Key'
          )}
        </button>
      </div>
    </div>
  );
};

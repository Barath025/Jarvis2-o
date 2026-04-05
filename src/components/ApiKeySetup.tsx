import React, { useState } from 'react';

export const ApiKeySetup = ({ onSave }: { onSave: (key: string) => void }) => {
  const [key, setKey] = useState('');
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-md border border-cyan-500/30">
        <h2 className="text-xl font-bold text-cyan-400 mb-4">JARVIS Setup</h2>
        <p className="text-gray-300 mb-4">Please enter your Gemini API Key to continue.</p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full bg-gray-800 text-white p-2 rounded mb-4 border border-gray-700"
          placeholder="AIza..."
        />
        <button
          onClick={() => onSave(key)}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded"
        >
          OK
        </button>
      </div>
    </div>
  );
};

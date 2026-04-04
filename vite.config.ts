import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Default Supabase credentials if not provided in environment
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://mvnwqroxrmaxxtzlmqhl.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bndxcm94cm1heHh0emxtcWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDcwMjMsImV4cCI6MjA5MDQyMzAyM30.0tB4P0KgBXicRb2Jw9SQuAxjacNFNtPi6vsn5tuB4pQ';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ""),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || env.VITE_API_KEY || ""),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_ANON_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mvnwqroxrmaxxtzlmqhl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bndxcm94cm1heHh0emxtcWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDcwMjMsImV4cCI6MjA5MDQyMzAyM30.0tB4P0KgBXicRb2Jw9SQuAxjacNFNtPi6vsn5tuB4pQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('test_connection').select('*').limit(1);
    if (error) {
      // If the table doesn't exist, it's still a partial success (connected but table missing)
      if (error.code === 'PGRST116' || error.message.includes('relation "test_connection" does not exist')) {
        return { status: 'connected', message: 'Supabase connected successfully (Table "test_connection" not found, which is expected if not created yet).' };
      }
      return { status: 'error', message: error.message };
    }
    return { status: 'success', message: 'Supabase connected and table verified.' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Unknown connection error' };
  }
};

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
let client
if (hasSupabaseConfig) {
  client = createClient(supabaseUrl, supabaseAnonKey)
} else {
  client = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase não configurado' } }),
      signOut: async () => ({ error: null }),
    },
  }
}
export const supabase = client

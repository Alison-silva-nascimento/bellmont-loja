import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const viteEnv = (import.meta as unknown as { env?: ImportMetaEnv }).env
const projectUrl = viteEnv?.VITE_SUPABASE_URL?.trim()
const publishableKey = viteEnv?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

const isPlaceholder = (value: string | undefined) => !value || value.includes('your-project') || value.includes('your_publishable')

export const isSupabaseConfigured = !isPlaceholder(projectUrl) && !isPlaceholder(publishableKey)

let client: SupabaseClient<Database> | null = null

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured || !projectUrl || !publishableKey) return null

  client ??= createClient<Database>(projectUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  })

  return client
}

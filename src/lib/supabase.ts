import { createBrowserClient } from '@supabase/ssr'

function getUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || url === 'your-supabase-url') return ''
  return url
}

function getKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key || key === 'your-supabase-anon-key') return ''
  return key
}

export function createClient() {
  const url = getUrl()
  const key = getKey()

  if (!url || !key) {
    // Return mock client during build/development without env vars
    return {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
        in: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        order: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        gte: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        lte: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        not: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signUp: () => Promise.resolve({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        admin: {
          createUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') }),
        },
      },
      channel: () => ({
        on: () => ({ subscribe: () => 'mock' }),
      }),
      removeChannel: () => {},
    } as any
  }

  return createBrowserClient(url, key)
}

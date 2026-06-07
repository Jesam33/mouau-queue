import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key === 'your-service-role-key') return ''
  return key
}

function createMockClient() {
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
      admin: {
        createUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') }),
      },
    },
  } as any
}

export async function createServerSupabaseClient() {
  const url = getUrl()
  const key = getKey()

  if (!url || !key) {
    return createMockClient()
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // ignore in SSR
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.delete({ name, ...options })
        } catch {
          // ignore in SSR
        }
      },
    },
  })
}

export async function createServiceRoleClient() {
  const url = getUrl()
  const key = getServiceKey()

  if (!url || !key) {
    return createMockClient()
  }

  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

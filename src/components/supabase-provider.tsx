"use client"

import { createContext, useContext, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import type { Profile } from "@/lib/types"

type SupabaseContextType = {
  supabase: SupabaseClient
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

const SupabaseContext = createContext<SupabaseContextType | null>(null)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [profile, setProfile] = useState<Profile | null>(null)

  return (
    <SupabaseContext.Provider value={{ supabase, profile, setProfile }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error("useSupabase must be used within SupabaseProvider")
  return ctx
}

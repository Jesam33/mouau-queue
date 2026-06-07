"use client"

import Link from "next/link"
import { useSupabase } from "./supabase-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Loader2, Moon, Sun, LogOut, BarChart3 } from "lucide-react"

export function Nav() {
  const { supabase, profile, setProfile } = useSupabase()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        fetchProfile(data.session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener?.subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    if (data) setProfile(data as any)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setProfile(null)
    router.push("/")
    router.refresh()
  }

  return (
    <nav className="mouau-gradient sticky top-0 z-50 border-b border-yellow-500/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center overflow-hidden">
            <img
              src="https://mouau.edu.ng/wp-content/uploads/2020/05/mouau_logo.jpg"
              alt="MOUAU"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-white">MOUAU</span>
            <span className="text-[10px] text-white/70 leading-tight">Smart Queue</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 text-sm">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white/60" />
          ) : profile ? (
            <div className="flex items-center gap-1">
              <Link
                href={profile.role === "admin" ? "/admin/queue" : "/"}
                className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {profile.full_name}
              </Link>
              {profile.role === "admin" && (
                <Link
                  href="/admin/analytics"
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Analytics"
                >
                  <BarChart3 className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/auth/login"
                className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                Student Login
              </Link>
              <Link
                href="/admin"
                className="px-4 py-1.5 rounded-lg bg-white/15 text-white font-medium hover:bg-white/25 transition-colors"
              >
                Admin
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

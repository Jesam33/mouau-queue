"use client"

import Link from "next/link"
import { useSupabase } from "./supabase-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Loader2, Moon, Sun, LogOut, BarChart3, Menu, X } from "lucide-react"
import logoImage from "@/images/mou_logo_icon.png"

export function Nav() {
  const { supabase, profile, setProfile } = useSupabase()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

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
          <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden">
            <img
              src={logoImage.src}
              alt="MOUAU"
              className="w-10 h-10 sm:w-14 sm:h-14 object-contain"
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2 text-sm">
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
                className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors max-w-[120px] truncate"
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

        {/* Mobile hamburger */}
        <div className="flex sm:hidden items-center gap-1">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-primary/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1 text-sm">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-white/60" />
              </div>
            ) : profile ? (
              <>
                <div className="px-3 py-2 text-white/60 text-xs uppercase tracking-wider">Signed in as</div>
                <Link
                  href={profile.role === "admin" ? "/admin/queue" : "/"}
                  className="block px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-colors font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  {profile.full_name}
                </Link>
                {profile.role === "admin" && (
                  <Link
                    href="/admin/analytics"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <BarChart3 className="w-4 h-4" /> Analytics
                  </Link>
                )}
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="block px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Student Login
                </Link>
                <Link
                  href="/auth/register"
                  className="block px-3 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
                <Link
                  href="/admin"
                  className="block px-3 py-2 rounded-lg bg-white/15 text-white font-medium hover:bg-white/25 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Admin Login
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

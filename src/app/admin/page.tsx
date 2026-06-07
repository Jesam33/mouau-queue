"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { toast } from "sonner"
import { Shield } from "lucide-react"

export default function AdminLoginPage() {
  const { supabase, setProfile } = useSupabase()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error("Invalid credentials")
      setLoading(false)
      return
    }

    if (data.user) {
      // Use server API to verify admin access (bypasses RLS issues)
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id }),
      })

      if (!res.ok) {
        toast.error("This account does not have admin access")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      const profile = await res.json()
      setProfile(profile)
      router.push("/admin/queue")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-green-50/40 flex items-center justify-center">
      <Card className="w-full max-w-sm mx-4 border-t-4 border-t-primary shadow-md">
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage your office queue
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="text-sm text-center mt-5 text-muted-foreground">
            No admin account?{" "}
            <Link href="/admin/register" className="text-primary font-medium hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

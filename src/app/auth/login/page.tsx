"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Nav } from "@/components/nav"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { toast } from "sonner"
import { LogIn } from "lucide-react"

function LoginForm() {
  const { supabase, setProfile } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [matricNumber, setMatricNumber] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (!matricNumber || !password) {
      toast.error("Please fill in all fields")
      setLoading(false)
      return
    }

    const email = `${matricNumber.toLowerCase()}@mouau.edu.ng`

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Invalid matric number or password"
        : error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (profile) {
        setProfile(profile as any)
        if (profile.role === "admin") {
          router.push("/admin/queue")
        } else {
          const redirect = searchParams.get("redirect") || "/"
          router.push(redirect)
        }
        router.refresh()
      }
    }
  }

  return (
    <Card className="border-t-4 border-t-primary shadow-md">
      <CardContent className="pt-8 pb-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in with your matric number
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Matric Number</label>
            <input
              type="text"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              placeholder="e.g. MOUAU/COM/22/001"
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
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-green-50/40">
      <Nav />
      <main className="max-w-sm mx-auto px-4 py-14">
        <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}

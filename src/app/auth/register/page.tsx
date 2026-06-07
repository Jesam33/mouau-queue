"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Nav } from "@/components/nav"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"

export default function RegisterPage() {
  const { supabase, setProfile } = useSupabase()
  const router = useRouter()
  const [form, setForm] = useState({
    matricNumber: "",
    fullName: "",
    department: "",
    level: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { matricNumber, fullName, department, level, password } = form

    if (!matricNumber || !fullName || !department || !level || !password) {
      toast.error("Please fill in all fields")
      setLoading(false)
      return
    }

    const email = `${matricNumber.toLowerCase()}@mouau.edu.ng`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { matric_number: matricNumber, full_name: fullName },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        matric_number: matricNumber,
        full_name: fullName,
        department,
        level,
        role: "student",
      })

      if (profileError) {
        toast.error(profileError.message || "Failed to create profile")
        console.error("Profile creation error:", profileError)
        setLoading(false)
        return
      }

      setProfile({
        id: data.user.id,
        matric_number: matricNumber,
        full_name: fullName,
        department,
        level,
        role: "student",
        office_id: null,
        created_at: new Date().toISOString(),
      } as any)

      toast.success("Registration successful!")
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-green-50/40">
      <Nav />
      <main className="max-w-sm mx-auto px-4 py-14">
        <Card className="border-t-4 border-t-accent shadow-md">
          <CardContent className="pt-8 pb-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6 text-accent" />
              </div>
              <h1 className="text-xl font-bold">Create account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Register to start using the queue system
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              {(["matricNumber", "fullName", "department", "level"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1.5 capitalize">
                    {field === "matricNumber" ? "Matric Number" : field === "fullName" ? "Full Name" : field}
                  </label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={
                      field === "matricNumber" ? "MOUAU/COM/22/001" :
                      field === "fullName" ? "John Doe" :
                      field === "department" ? "Computer Engineering" :
                      "300L"
                    }
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                    required
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="text-sm text-center mt-5 text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

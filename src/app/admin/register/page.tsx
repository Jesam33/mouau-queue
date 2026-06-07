"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { Shield } from "lucide-react"

export default function AdminRegisterPage() {
  const router = useRouter()
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    officeId: "",
    setupCode: "",
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/offices")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setOffices(list.map((o: any) => ({ id: o.id, name: o.name })))
      })
      .catch(() => toast.error("Failed to load offices"))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const { email, password, fullName, officeId, setupCode } = form
    if (!email || !password || !fullName || !officeId || !setupCode) {
      toast.error("Please fill in all fields")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/admin/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, officeId, setupCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Registration failed")
        setSubmitting(false)
        return
      }

      toast.success("Admin registered successfully! Please login.")
      router.push("/admin")
    } catch {
      toast.error("Network error")
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-t-4 border-t-accent shadow-md">
        <CardContent className="pt-8 pb-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-xl font-bold">Admin Registration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create an admin account to manage an office queue
            </p>
          </div>
          {loading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading offices...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                  required
                />
              </div>
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
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Office</label>
                <select
                  value={form.officeId}
                  onChange={(e) => setForm({ ...form, officeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                  required
                >
                  <option value="">Select an office...</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Admin Setup Code</label>
                <input
                  type="password"
                  value={form.setupCode}
                  onChange={(e) => setForm({ ...form, setupCode: e.target.value })}
                  placeholder="Enter the admin setup code"
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-muted/30"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
              >
                {submitting ? "Registering..." : "Register Admin"}
              </button>
            </form>
          )}
          <p className="text-sm text-center mt-5 text-muted-foreground">
            Already have an account?{" "}
            <Link href="/admin" className="text-primary font-medium hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

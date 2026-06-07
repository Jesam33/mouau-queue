"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

interface Analytics {
  totalServed: number
  avgServiceMinutes: number
  currentQueue: number
  hourlyData: { hour: number; count: number }[]
}

export default function AdminAnalyticsPage() {
  const { supabase, profile, setProfile } = useSupabase()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push("/admin"); return }
        supabase.from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => {
            if (!data) { router.push("/admin"); return }
            setProfile(data as any)
            if (data.role !== "admin") { router.push("/"); return }
            loadAnalytics()
          })
      })
      return
    }
    if (profile.role !== "admin") { router.push("/"); return }
    loadAnalytics()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadAnalytics() {
    if (!profile?.office_id) return
    const res = await fetch("/api/admin/analytics")
    if (res.ok) {
      const data = await res.json()
      setAnalytics(data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
          </div>
          <div className="skeleton h-48 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-3">
        <Link href="/admin/queue" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Queue
        </Link>
        <h1 className="font-bold mt-1">Analytics</h1>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="text-center">
              <p className="text-2xl font-bold">{analytics?.totalServed || 0}</p>
              <p className="text-xs text-muted-foreground">Served Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-2xl font-bold">{analytics?.avgServiceMinutes ? `${Math.round(analytics.avgServiceMinutes)}m` : "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Service Time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-2xl font-bold">{analytics?.currentQueue || 0}</p>
              <p className="text-xs text-muted-foreground">Current Queue</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm">Hourly Breakdown (Today)</h2>
          </CardHeader>
          <CardContent>
            {analytics?.hourlyData && analytics.hourlyData.length > 0 ? (
              <div className="h-40 flex items-end gap-1">
                {analytics.hourlyData.map(({ hour, count }) => {
                  const maxCount = Math.max(...analytics.hourlyData.map(d => d.count), 1)
                  const height = (count / maxCount) * 100
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full bg-primary rounded-t" style={{ height: `${Math.max(4, height)}%`, opacity: 0.2 + (height / 100) * 0.8 }} />
                      {hour % 3 === 0 && <span className="text-[10px] text-muted-foreground">{hour}:00</span>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available yet today</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

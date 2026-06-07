"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Nav } from "./nav"
import { Card, CardContent, CardHeader } from "./ui/card"
import { CongestionBadge } from "./ui/badge"
import { useSupabase } from "./supabase-provider"
import type { OfficeWithMetrics, QueueSnapshot } from "@/lib/types"
import { getCongestionLevel, getEstimatedWait } from "@/lib/types"
import { AVG_SERVICE_MINUTES } from "@/lib/constants"
import { Building2, Wallet, FileText, Users, Monitor, BookOpen, Landmark, Globe, Clock, UsersRound, ArrowRight, ChevronLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const iconMap: Record<string, React.ElementType> = {
  Building2, Wallet, FileText, Users, Monitor, BookOpen, Landmark, Globe,
  Building: Building2,
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="skeleton h-4 w-16 mb-4" />
        <div className="flex items-start gap-4 mb-6">
          <div className="skeleton h-14 w-14 rounded-xl" />
          <div className="flex-1">
            <div className="skeleton h-6 w-48 mb-2" />
            <div className="skeleton h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="text-center">
              <div className="skeleton h-8 w-16 mx-auto mb-2" />
              <div className="skeleton h-3 w-20 mx-auto" />
            </CardContent></Card>
          ))}
        </div>
        <div className="skeleton h-12 w-full rounded-lg mb-6" />
        <div className="skeleton h-32 w-full rounded-lg mb-6" />
        <div className="skeleton h-48 w-full rounded-lg" />
      </main>
    </div>
  )
}

export function OfficeDetail({ officeId }: { officeId: string }) {
  const { supabase, profile } = useSupabase()
  const router = useRouter()
  const [office, setOffice] = useState<OfficeWithMetrics | null>(null)
  const [prediction, setPrediction] = useState<string>("")
  const [snapshots, setSnapshots] = useState<QueueSnapshot[]>([])
  const [joining, setJoining] = useState(false)
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState(false)
  const [existingTicket, setExistingTicket] = useState<{ id: string; ticket_number: string } | null>(null)

  const loadOffice = useCallback(async () => {
    const { data: officeData } = await supabase
      .from("offices")
      .select("*")
      .eq("id", officeId)
      .single()

    if (!officeData) { setLoading(false); return }

    const { count: queueCount } = await supabase
      .from("queue_entries")
      .select("*", { count: "exact", head: true })
      .eq("office_id", officeId)
      .in("status", ["waiting", "checked_in", "being_served"])

    const queueCountNum = queueCount || 0

    setOffice({
      ...officeData,
      queue_count: queueCountNum,
      estimated_wait_minutes: getEstimatedWait(queueCountNum, AVG_SERVICE_MINUTES),
      congestion_level: getCongestionLevel(queueCountNum, officeData.capacity),
      checked_in_count: 0,
    })

    const { data: snapData } = await supabase
      .from("queue_snapshots")
      .select("*")
      .eq("office_id", officeId)
      .order("recorded_at", { ascending: false })
      .limit(112)

    if (snapData) setSnapshots(snapData)

    setLoading(false)

    // Fetch prediction
    try {
      const res = await fetch(`/api/offices/${officeId}/prediction`)
      if (res.ok) {
        const data = await res.json()
        setPrediction(data.prediction)
      }
    } catch { /* ignore */ }
  }, [supabase, officeId])

  useEffect(() => { loadOffice() }, [loadOffice])

  useEffect(() => {
    if (!profile?.id) { setExistingTicket(null); return }
    supabase
      .from("queue_entries")
      .select("id, ticket_number")
      .eq("student_id", profile.id)
      .eq("office_id", officeId)
      .in("status", ["waiting", "checked_in", "being_served"])
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExistingTicket(data)
        else setExistingTicket(null)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, officeId])

  async function handleJoinQueue() {
    if (!profile) {
      router.push(`/auth/login?redirect=/office/${officeId}`)
      return
    }
    setJoining(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ office_id: officeId }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.ticket_id) {
          router.push(`/ticket/${err.ticket_id}`)
          return
        }
        toast.error(err.error || "Failed to join queue")
        setJoining(false)
        return
      }
      const ticket = await res.json()
      router.push(`/ticket/${ticket.id}`)
    } catch {
      toast.error("Network error. Please try again.")
      setJoining(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (!office) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Office not found.</p>
          <Link href="/" className="text-foreground underline">Back to dashboard</Link>
        </main>
      </div>
    )
  }

  const Icon = iconMap[office.icon] || Building2
  const fullness = Math.min((office.queue_count / office.capacity) * 100, 100)

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="bg-gradient-to-r from-primary/90 via-primary/80 to-accent/80 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center text-sm text-white/60 hover:text-white mb-3 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/15 backdrop-blur">
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{office.name}</h1>
                <CongestionBadge level={office.congestion_level} />
              </div>
              <p className="text-sm text-white/70">
                {office.operating_hours_start.slice(0, 5)} – {office.operating_hours_end.slice(0, 5)} · Open now
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-t-2 border-t-green-500">
            <CardContent className="text-center pt-4">
              <UsersRound className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-foreground">{office.queue_count}</p>
              <p className="text-xs text-muted-foreground">In Queue</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-yellow-500">
            <CardContent className="text-center pt-4">
              <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-2xl font-bold text-foreground">
                {office.estimated_wait_minutes > 0 ? `~${office.estimated_wait_minutes}` : "0"}
              </p>
              <p className="text-xs text-muted-foreground">Est. Wait (min)</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-green-500">
            <CardContent className="text-center pt-4">
              <UsersRound className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-foreground">{office.capacity}</p>
              <p className="text-xs text-muted-foreground">Capacity</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 mb-6 bg-muted/50 rounded-xl px-4 py-3">
          <div className="flex-1 bg-secondary rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${fullness < 50 ? "bg-green-500" : fullness < 80 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${fullness}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            {Math.round(fullness)}% filled
          </span>
        </div>

        {existingTicket ? (
          <button
            onClick={() => { setNavigating(true); router.push(`/ticket/${existingTicket.id}`) }}
            disabled={navigating}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium mb-6 flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
          >
            {navigating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              <>View My Ticket ({existingTicket.ticket_number}) <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        ) : (
          <button
            onClick={handleJoinQueue}
            disabled={joining}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium mb-6 flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
          >
            {joining ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Joining...
              </span>
            ) : (
              <>
                Join Queue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {prediction && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI Prediction
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{prediction}</p>
            </CardContent>
          </Card>
        )}

        {snapshots.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-sm">Hourly Queue Trend (Last 14 Days)</h2>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-end gap-0.5">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourSnaps = snapshots.filter((s) => s.hour === hour)
                  const avg = hourSnaps.length > 0
                    ? hourSnaps.reduce((sum, s) => sum + s.count, 0) / hourSnaps.length
                    : 0
                  const height = Math.max(4, (avg / office.capacity) * 100)
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t bg-primary"
                        style={{ height: `${height}%`, opacity: 0.2 + (height / 100) * 0.8 }}
                      />
                      {hour % 4 === 0 && (
                        <span className="text-[10px] text-muted-foreground">{hour}:00</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

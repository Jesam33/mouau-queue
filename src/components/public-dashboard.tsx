"use client"

import { useEffect, useState, useCallback } from "react"
import { Nav } from "./nav"
import { OfficeCard } from "./office-card"
import type { OfficeWithMetrics } from "@/lib/types"
import { getCongestionLevel, getEstimatedWait } from "@/lib/types"
import { useSupabase } from "./supabase-provider"
import { AVG_SERVICE_MINUTES } from "@/lib/constants"
import { RefreshCw, ChevronRight } from "lucide-react"
import Link from "next/link"

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="skeleton h-48 w-full rounded-2xl mb-8" />
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-7 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1">
                <div className="skeleton h-4 w-32 mb-1.5" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              {[1, 2, 3].map((j) => (
                <div key={j}>
                  <div className="skeleton h-6 w-10 mx-auto mb-1" />
                  <div className="skeleton h-2.5 w-12 mx-auto" />
                </div>
              ))}
            </div>
            <div className="skeleton h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PublicDashboard() {
  const { supabase } = useSupabase()
  const [offices, setOffices] = useState<OfficeWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOffices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    const { data: officesData } = await supabase.from("offices").select("*")
    if (!officesData) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    const officesWithMetrics: OfficeWithMetrics[] = await Promise.all(
      officesData.map(async (office) => {
        const { count: queueCount } = await supabase
          .from("queue_entries")
          .select("*", { count: "exact", head: true })
          .eq("office_id", office.id)
          .in("status", ["waiting", "checked_in", "being_served"])

        const count = queueCount || 0
        return {
          ...office,
          queue_count: count,
          estimated_wait_minutes: getEstimatedWait(count, AVG_SERVICE_MINUTES),
          congestion_level: getCongestionLevel(count, office.capacity),
          checked_in_count: 0,
        } as OfficeWithMetrics
      })
    )

    setOffices(officesWithMetrics)
    setLoading(false)
    setRefreshing(false)
  }, [supabase])

  useEffect(() => {
    fetchOffices()
    const interval = setInterval(() => fetchOffices(true), 60000)
    return () => clearInterval(interval)
  }, [fetchOffices])

  useEffect(() => {
    const channel = supabase
      .channel("queue-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries" },
        () => fetchOffices(true)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchOffices])

  const totalInQueue = offices.reduce((sum, o) => sum + o.queue_count, 0)
  const avgWait = totalInQueue > 0
    ? Math.round(offices.reduce((sum, o) => sum + o.estimated_wait_minutes, 0) / offices.filter(o => o.queue_count > 0).length)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <main>
          <div className="bg-primary text-white">
            <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
              <div className="max-w-2xl">
                <p className="text-sm text-white/60 font-medium uppercase tracking-widest mb-3">
                  Michael Okpara University of Agriculture, Umudike
                </p>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  MOUAU Smart Queue
                </h1>
                <p className="text-base text-white/80 mt-3 max-w-lg">
                  Skip the lines. Join any administrative office queue from your phone and track your turn in real time.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-7">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-1.5 bg-white text-primary px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
                  >
                    Get Started <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-1.5 border border-white/30 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 -mt-6">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary">{totalInQueue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Currently in queue</p>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary">{avgWait}m</p>
                <p className="text-xs text-muted-foreground mt-0.5">Average wait time</p>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary">{offices.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Offices available</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">All Offices</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totalInQueue} students waiting &middot; {offices.length} offices
                </p>
              </div>
              <button
                onClick={() => fetchOffices(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {offices.map((office) => (
                <OfficeCard key={office.id} office={office} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-8 text-center">
              Auto-refreshes every 60s &middot; Real-time updates &middot; QR check-in
            </p>
          </div>
        </main>
      )}
    </div>
  )
}

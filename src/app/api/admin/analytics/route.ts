import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin" || !profile.office_id) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Total served today
  const { count: totalServed } = await supabase
    .from("queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("office_id", profile.office_id)
    .eq("status", "served")
    .gte("served_at", todayStart.toISOString())
    .lte("served_at", todayEnd.toISOString())

  // Average service time
  const { data: servedTickets } = await supabase
    .from("queue_entries")
    .select("checked_in_at, served_at")
    .eq("office_id", profile.office_id)
    .eq("status", "served")
    .gte("served_at", todayStart.toISOString())
    .lte("served_at", todayEnd.toISOString())
    .not("checked_in_at", "is", null)

  let avgServiceMinutes = 0
  if (servedTickets && servedTickets.length > 0) {
    const totalMinutes = (servedTickets as { checked_in_at: string; served_at: string }[]).reduce((sum, t) => {
      const checkedIn = new Date(t.checked_in_at!).getTime()
      const served = new Date(t.served_at!).getTime()
      return sum + (served - checkedIn) / 60000
    }, 0)
    avgServiceMinutes = totalMinutes / servedTickets.length
  }

  // Current queue length
  const { count: currentQueue } = await supabase
    .from("queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("office_id", profile.office_id)
    .in("status", ["waiting", "checked_in", "being_served"])

  // Hourly breakdown
  const { data: hourlyData } = await supabase
    .from("queue_snapshots")
    .select("hour, count")
    .eq("office_id", profile.office_id)
    .gte("recorded_at", todayStart.toISOString())
    .lte("recorded_at", todayEnd.toISOString())
    .order("hour", { ascending: true })

  // Aggregate hourly
  const hourlyMap = new Map<number, number[]>()
  hourlyData?.forEach((s: { hour: number; count: number }) => {
    const arr = hourlyMap.get(s.hour) || []
    arr.push(s.count)
    hourlyMap.set(s.hour, arr)
  })

  const hourlyAggregated = Array.from({ length: 24 }, (_, i) => {
    const vals = hourlyMap.get(i) || []
    return {
      hour: i,
      count: vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0,
    }
  })

  return NextResponse.json({
    totalServed: totalServed || 0,
    avgServiceMinutes: Math.round(avgServiceMinutes * 10) / 10,
    currentQueue: currentQueue || 0,
    hourlyData: hourlyAggregated,
  })
}

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET() {
  // Verify cron secret (optional, add auth check in production)
  if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
    // In production, the request comes from Vercel Cron which doesn't pass custom headers easily
    // Consider using a query param token instead
  }

  const supabase = await createServiceRoleClient()

  const { data: offices } = await supabase.from("offices").select("id")

  if (!offices || offices.length === 0) {
    return NextResponse.json({ error: "No offices found" }, { status: 404 })
  }

  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()

  const snapshots = await Promise.all(
    offices.map(async (office: { id: string }) => {
      const { count } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("office_id", office.id)
        .in("status", ["waiting", "checked_in", "being_served"])

      return {
        office_id: office.id,
        count: count || 0,
        hour,
        day_of_week: dayOfWeek,
        recorded_at: now.toISOString(),
      }
    })
  )

  const { error } = await supabase.from("queue_snapshots").insert(snapshots)

  if (error) {
    console.error("Failed to record snapshots:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    recorded: snapshots.length,
    timestamp: now.toISOString(),
  })
}

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = await createServiceRoleClient()

  const { data: offices } = await supabase.from("offices").select("*")

  if (!offices) {
    return NextResponse.json({ error: "No offices found" }, { status: 404 })
  }

  const officesWithMetrics = await Promise.all(
    (offices as any[]).map(async (office: any) => {
      const { count } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("office_id", office.id)
        .in("status", ["waiting", "checked_in", "being_served"])

      const c = count || 0
      const ratio = c / office.capacity
      let congestion: string
      if (ratio === 0) congestion = "Low"
      else if (ratio <= 0.5) congestion = "Low"
      else if (ratio <= 0.75) congestion = "Moderate"
      else if (ratio <= 1.0) congestion = "High"
      else congestion = "Critical"

      return {
        ...office,
        queue_count: c,
        estimated_wait_minutes: c > 1 ? (c - 1) * 3 : 0,
        congestion_level: congestion,
      }
    })
  )

  return NextResponse.json(officesWithMetrics)
}

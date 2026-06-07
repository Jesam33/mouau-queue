import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { office_id } = await req.json()
  if (!office_id) {
    return NextResponse.json({ error: "Office ID required" }, { status: 400 })
  }

  // Check for existing active ticket
  const { data: existing } = await supabase
    .from("queue_entries")
    .select("id, status")
    .eq("student_id", user.id)
    .eq("office_id", office_id)
    .in("status", ["waiting", "checked_in", "being_served"])
    .single()

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active ticket in this office", ticket_id: existing.id },
      { status: 409 }
    )
  }

  // Get office info
  const { data: office } = await supabase
    .from("offices")
    .select("name")
    .eq("id", office_id)
    .single()

  if (!office) {
    return NextResponse.json({ error: "Office not found" }, { status: 404 })
  }

  // Get next position and ticket number (count all entries ever for this office)
  const { count: totalCount } = await supabase
    .from("queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("office_id", office_id)

  // Get active position
  const { count: activeCount } = await supabase
    .from("queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("office_id", office_id)
    .in("status", ["waiting", "checked_in", "being_served"])

  const position = (activeCount || 0) + 1
  const nextNumber = (totalCount || 0) + 1
  const prefix = office.name.substring(0, 3).toUpperCase()
  const ticketNumber = `${prefix}-${String(nextNumber).padStart(3, "0")}`

  // Create ticket using service role to bypass RLS for student insert
  // Actually, let's use the student's session
  const { data: ticket, error } = await supabase
    .from("queue_entries")
    .insert({
      office_id,
      student_id: user.id,
      ticket_number: ticketNumber,
      position,
      join_method: "remote",
      status: "waiting",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(ticket, { status: 201 })
}

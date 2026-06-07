import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("office_id, role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { data: ticket } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("id", params.id)
    .eq("office_id", profile.office_id)
    .single()

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  }

  const now = new Date().toISOString()
  const updates: Record<string, any> = {}

  if (ticket.status === "checked_in") {
    updates.status = "being_served"
  } else if (ticket.status === "being_served") {
    updates.status = "served"
    updates.served_at = now
  } else {
    return NextResponse.json(
      { error: `Cannot serve ticket with status: ${ticket.status}` },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("queue_entries")
    .update(updates)
    .eq("id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create notification for student if served
  if (updates.status === "served" || updates.status === "being_served") {
    await supabase.from("notifications").insert({
      student_id: ticket.student_id,
      ticket_id: ticket.id,
      message: updates.status === "served"
        ? "Your ticket has been served. Thank you!"
        : "You're now being served. Please approach the counter.",
    })
  }

  return NextResponse.json({ success: true, status: updates.status })
}

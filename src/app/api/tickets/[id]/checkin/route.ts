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

  const { data: ticket } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("id", params.id)
    .eq("student_id", user.id)
    .single()

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  }

  if (ticket.status !== "waiting") {
    return NextResponse.json({ error: `Cannot check in ticket with status: ${ticket.status}` }, { status: 400 })
  }

  const { error } = await supabase
    .from("queue_entries")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

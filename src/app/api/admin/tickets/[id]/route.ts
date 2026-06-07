import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type Action = "serve" | "skip" | "cancel"

const actionMap: Record<Action, { status: string; served_at?: string }> = {
  serve: { status: "served", served_at: new Date().toISOString() },
  skip: { status: "skipped" },
  cancel: { status: "cancelled" },
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  // Determine action from URL path
  const url = new URL(req.url)
  const pathParts = url.pathname.split("/")
  const action = pathParts[pathParts.length - 1] as Action

  if (!["serve", "skip", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
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

  const update = actionMap[action]
  const { error } = await supabase
    .from("queue_entries")
    .update(update)
    .eq("id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

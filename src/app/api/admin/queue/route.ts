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

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { data: tickets } = await supabase
    .from("queue_entries")
    .select("*, profiles(full_name, matric_number, department, level)")
    .eq("office_id", profile.office_id)
    .in("status", ["waiting", "checked_in", "being_served"])
    .order("position", { ascending: true })

  return NextResponse.json(tickets || [])
}

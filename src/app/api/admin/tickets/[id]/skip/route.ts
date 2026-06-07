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

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "skipped" })
    .eq("id", params.id)
    .eq("office_id", profile.office_id)
    .in("status", ["checked_in", "waiting"])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

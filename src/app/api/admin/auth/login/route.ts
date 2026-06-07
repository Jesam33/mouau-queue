import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase-server"

export async function POST(req: Request) {
  const { userId } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Not an admin" }, { status: 403 })
  }

  if (!profile.office_id) {
    return NextResponse.json({ error: "No office assigned" }, { status: 403 })
  }

  return NextResponse.json(profile)
}

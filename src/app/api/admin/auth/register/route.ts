import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase-server"

export async function POST(req: Request) {
  const { email, password, fullName, officeId, setupCode } = await req.json()

  if (!email || !password || !fullName || !officeId || !setupCode) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  const adminCode = process.env.ADMIN_SETUP_CODE || "MOUAU-ADMIN-2026"

  if (setupCode !== adminCode) {
    return NextResponse.json({ error: "Invalid admin setup code" }, { status: 403 })
  }

  const supabase = await createServiceRoleClient()

  // Verify office exists
  const { data: office } = await supabase
    .from("offices")
    .select("id")
    .eq("id", officeId)
    .single()

  if (!office) {
    return NextResponse.json({ error: "Office not found" }, { status: 404 })
  }

  // Create auth user (Supabase will reject duplicate emails)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "admin" },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }

  // Create profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    matric_number: `ADMIN-${Date.now()}`,
    full_name: fullName,
    role: "admin",
    office_id: officeId,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: authData.user.id }, { status: 201 })
}

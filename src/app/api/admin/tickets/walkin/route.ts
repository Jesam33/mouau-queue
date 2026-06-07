import { NextResponse } from "next/server"
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server"

export async function POST(req: Request) {
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

  if (!profile || profile.role !== "admin" || !profile.office_id) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { full_name, matric_number } = await req.json()

  if (!full_name) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 })
  }

  const serviceClient = await createServiceRoleClient()

  // Get office
  const { data: office } = await serviceClient
    .from("offices")
    .select("name")
    .eq("id", profile.office_id)
    .single()

  if (!office) {
    return NextResponse.json({ error: "Office not found" }, { status: 404 })
  }

  // Find or create student profile
  let studentId: string

  if (matric_number) {
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("matric_number", matric_number)
      .single()

    if (existingProfile) {
      studentId = existingProfile.id
    } else {
      // Create a dummy auth user for walk-in
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email: `${matric_number.toLowerCase()}@walkin.mouau.edu.ng`,
        password: Math.random().toString(36).slice(2),
        email_confirm: true,
      })

      if (createError || !newUser.user) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
      }

      const { error: profileError } = await serviceClient.from("profiles").insert({
        id: newUser.user.id,
        matric_number,
        full_name,
        role: "student",
      })

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      studentId = newUser.user.id
    }
  } else {
    // Create a guest user
    const guestEmail = `walkin-${Date.now()}@walkin.mouau.edu.ng`
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: guestEmail,
      password: Math.random().toString(36).slice(2),
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    const { error: profileError } = await serviceClient.from("profiles").insert({
      id: newUser.user.id,
      matric_number: `WALKIN-${Date.now()}`,
      full_name,
      role: "student",
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    studentId = newUser.user.id
  }

  // Get next position
  const { count } = await serviceClient
    .from("queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("office_id", profile.office_id)
    .in("status", ["waiting", "checked_in", "being_served"])

  const position = (count || 0) + 1
  const prefix = office.name.substring(0, 3).toUpperCase()
  const ticketNumber = `${prefix}-${String(position).padStart(3, "0")}`

  const { data: ticket, error: ticketError } = await serviceClient
    .from("queue_entries")
    .insert({
      office_id: profile.office_id,
      student_id: studentId,
      ticket_number: ticketNumber,
      position,
      join_method: "walkin",
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (ticketError) {
    return NextResponse.json({ error: ticketError.message }, { status: 500 })
  }

  return NextResponse.json(ticket, { status: 201 })
}

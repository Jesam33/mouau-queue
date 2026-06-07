// Seed script for MOUAU Smart Queue Management System
// Run with: npx ts-node scripts/seed.ts
// or: npx tsx scripts/seed.ts

const { createClient } = require("@supabase/supabase-js")

require("dotenv").config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log("Seeding offices...")

  const offices = [
    {
      name: "Registry",
      icon: "Building2",
      color: "#2563eb",
      capacity: 30,
      operating_hours_start: "08:00",
      operating_hours_end: "16:00",
    },
    {
      name: "Bursary",
      icon: "Wallet",
      color: "#16a34a",
      capacity: 25,
      operating_hours_start: "08:00",
      operating_hours_end: "15:00",
    },
    {
      name: "Exams & Records",
      icon: "FileText",
      color: "#d97706",
      capacity: 20,
      operating_hours_start: "08:00",
      operating_hours_end: "16:00",
    },
    {
      name: "Students Affairs",
      icon: "Users",
      color: "#dc2626",
      capacity: 30,
      operating_hours_start: "08:00",
      operating_hours_end: "16:00",
    },
  ]

  for (const office of offices) {
    const { error } = await supabase.from("offices").insert(office)
    if (error) {
      console.error(`Failed to insert ${office.name}:`, error.message)
    } else {
      console.log(`  ✓ ${office.name}`)
    }
  }

  console.log("\nCreating admin user...")
  // Create an admin user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: "admin@registry.mouau.edu.ng",
    password: "admin123",
    email_confirm: true,
  })

  if (authError) {
    console.error("Failed to create admin user:", authError.message)
  } else if (authUser.user) {
    console.log("  ✓ Admin auth user created")

    // Get registry office
    const { data: registryOffice } = await supabase
      .from("offices")
      .select("id")
      .eq("name", "Registry")
      .single()

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authUser.user.id,
      matric_number: "ADMIN-REG-001",
      full_name: "Registry Admin",
      department: "Registry",
      level: "Staff",
      role: "admin",
      office_id: registryOffice?.id || null,
    })

    if (profileError) {
      console.error("Failed to create admin profile:", profileError.message)
    } else {
      console.log("  ✓ Admin profile created")
    }
  }

  console.log("\nGenerating historical snapshots for AI prediction...")
  const { data: allOffices } = await supabase.from("offices").select("id, name, capacity")

  if (allOffices) {
    for (const office of allOffices) {
      const snapshots = []
      for (let day = 0; day < 14; day++) {
        const date = new Date()
        date.setDate(date.getDate() - day)
        const dayOfWeek = date.getDay()

        for (let hour = 8; hour <= 16; hour++) {
          // Simulate realistic queue patterns
          let baseCount: number
          if (hour >= 10 && hour <= 12) {
            // Peak hours
            baseCount = Math.floor(office.capacity * (0.6 + Math.random() * 0.35))
          } else if (hour >= 8 && hour < 10) {
            // Morning ramp-up
            baseCount = Math.floor(office.capacity * (0.2 + Math.random() * 0.4))
          } else {
            // Afternoon decline
            baseCount = Math.floor(office.capacity * (0.1 + Math.random() * 0.3))
          }

          // Lower on weekends
          const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.1 : 1

          snapshots.push({
            office_id: office.id,
            count: Math.round(baseCount * weekendMultiplier),
            hour,
            day_of_week: dayOfWeek,
            recorded_at: new Date(date.setHours(hour, 0, 0, 0)).toISOString(),
          })
        }
      }

      // Insert in batches
      for (let i = 0; i < snapshots.length; i += 50) {
        const batch = snapshots.slice(i, i + 50)
        const { error } = await supabase.from("queue_snapshots").insert(batch)
        if (error) {
          console.error(`  ✗ ${office.name}: ${error.message}`)
        }
      }
      console.log(`  ✓ ${office.name}: ${snapshots.length} snapshots`)
    }
  }

  console.log("\n✓ Seed complete!")
  console.log("\nAdmin login credentials:")
  console.log("  Email: admin@registry.mouau.edu.ng")
  console.log("  Password: admin123")
}

seed().catch(console.error)

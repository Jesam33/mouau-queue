import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase-server"
import { PREDICTION_CACHE_TTL } from "@/lib/constants"

const cache = new Map<string, { prediction: string; timestamp: number }>()

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const officeId = params.id
  const cacheKey = `prediction-${officeId}`
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < PREDICTION_CACHE_TTL) {
    return NextResponse.json({ prediction: cached.prediction, cached: true })
  }

  const supabase = await createServiceRoleClient()

  const { data: office } = await supabase
    .from("offices")
    .select("name")
    .eq("id", officeId)
    .single()

  if (!office) {
    return NextResponse.json({ error: "Office not found" }, { status: 404 })
  }

  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const { data: snapshots } = await supabase
    .from("queue_snapshots")
    .select("*")
    .eq("office_id", officeId)
    .gte("recorded_at", twoWeeksAgo.toISOString())
    .order("recorded_at", { ascending: true })

  const { count } = await supabase
    .from("queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("office_id", officeId)
    .in("status", ["waiting", "checked_in", "being_served"])

  const now = new Date()
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // Fallback prediction when no API key
    const fallback = `The ${office.name} currently has ${count || 0} people in queue. Based on historical data, peak hours are typically between 10:00 and 13:00. For the shortest wait, consider visiting before 9:00 or after 14:00.`
    cache.set(cacheKey, { prediction: fallback, timestamp: Date.now() })
    return NextResponse.json({ prediction: fallback })
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-20241022",
        max_tokens: 200,
        system: `You are a queue prediction assistant for ${office.name} at Michael Okpara University of Agriculture, Umudike. Analyze the historical queue data provided and predict congestion for the next 3 hours. Be specific and practical. Respond in 3-4 sentences.`,
        messages: [
          {
            role: "user",
            content: `Here is the queue data for the last 14 days for this office, broken down by hour and day of week: ${JSON.stringify(snapshots || [])}. Today is ${days[now.getDay()]}, current time is ${now.getHours()}:00, current queue count is ${count || 0}. What should students expect for the rest of today?`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const prediction = result.content?.[0]?.text || "No prediction available."

    cache.set(cacheKey, { prediction, timestamp: Date.now() })
    return NextResponse.json({ prediction })
  } catch {
    return NextResponse.json({
      prediction: `The ${office.name} currently has ${count || 0} people waiting. Typical busy hours at MOUAU are 10am-1pm. Consider visiting early morning or after 2pm for shorter wait times.`,
    })
  }
}

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type ChatHistoryMessage = {
  role: "user" | "assistant"
  content: string
}

type OfficeSnapshot = {
  name: string
  capacity: number
  hours: string
  queue_count: number
  congestion: number
}

function parseRetryDelaySeconds(retryAfterHeader: string | null, errorJson: any): number | undefined {
  const headerSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : Number.NaN
  if (Number.isFinite(headerSeconds)) return headerSeconds

  const retryAfterBody = errorJson?.error?.metadata?.retry_after
  if (typeof retryAfterBody === "number" && Number.isFinite(retryAfterBody)) {
    return retryAfterBody
  }

  return undefined
}

function parseSuggestedModelFromError(errorJson: any): string | undefined {
  const message = errorJson?.error?.message
  if (typeof message !== "string") return undefined

  const match = message.match(/use this slug instead:\s*([^\s]+)/i)
  return match?.[1]
}

function buildFallbackReply(
  officesWithData: OfficeSnapshot[],
  options?: { quotaExceeded?: boolean; retryAfterSeconds?: number },
) {
  const sortedByCongestion = [...officesWithData].sort((a, b) => b.congestion - a.congestion)
  const busiest = sortedByCongestion.slice(0, 2)
  const calmest = [...sortedByCongestion].reverse().slice(0, 2)

  const formatOffice = (office: OfficeSnapshot) => {
    const pct = Math.round(office.congestion * 100)
    return `${office.name} (${office.queue_count} waiting, ~${pct}% load, hours ${office.hours})`
  }

  const intro = options?.quotaExceeded
    ? "I can't reach the AI provider right now because the project has hit an API quota or rate limit."
    : "I'm having trouble reaching the AI model right now."

  const retryText = options?.retryAfterSeconds
    ? `Please try again in about ${options.retryAfterSeconds} seconds.`
    : "Please try again shortly."

  return `${intro} ${retryText}\n\nLive queue snapshot:\n- Busiest now: ${busiest.map(formatOffice).join("; ")}\n- Less busy now: ${calmest.map(formatOffice).join("; ")}\n\nYou can still ask about current queue levels while AI is recovering.`
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  const rawHistory: unknown[] = Array.isArray(body?.history) ? body.history : []
  const history: ChatHistoryMessage[] = rawHistory
    .filter(
      (msg: unknown): msg is ChatHistoryMessage => {
        if (!msg || typeof msg !== "object") return false
        const maybeMessage = msg as Partial<ChatHistoryMessage>
        return (maybeMessage.role === "user" || maybeMessage.role === "assistant")
          && typeof maybeMessage.content === "string"
          && maybeMessage.content.trim().length > 0
      },
    )
    .slice(-8)

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  const safeMessage = message.slice(0, 1000)

  const supabase = await createServiceRoleClient()

  const { data: offices } = await supabase
    .from("offices")
    .select("*")

  if (!offices || offices.length === 0) {
    return NextResponse.json({ error: "No offices found" }, { status: 404 })
  }

  const officesWithData: OfficeSnapshot[] = await Promise.all(
    offices.map(async (office: { id: string; name: string; capacity: number; operating_hours_start: string; operating_hours_end: string }) => {
      const { count } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("office_id", office.id)
        .in("status", ["waiting", "checked_in", "being_served"])

      return {
        name: office.name,
        capacity: office.capacity,
        hours: `${office.operating_hours_start?.slice(0, 5)}-${office.operating_hours_end?.slice(0, 5)}`,
        queue_count: count || 0,
        congestion: count && office.capacity
          ? count / office.capacity
          : 0,
      }
    })
  )

  const now = new Date()
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  const systemContext = `You are a queue assistant for Michael Okpara University of Agriculture, Umudike (MOUAU). You help students navigate campus office queues.

Today is ${days[now.getDay()]}, ${now.getHours()}:00.

Here is the current status of all offices:
${JSON.stringify(officesWithData, null, 2)}

Answer questions about which offices are busy, estimated wait times, operating hours, and recommendations. Be friendly, concise, and practical. If you don't know something, say so.`

  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  const openRouterModel = process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free"
  const openRouterFallbackModel = process.env.OPENROUTER_FALLBACK_MODEL?.trim()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey || apiKey === "replace-with-your-new-openrouter-key") {
    return NextResponse.json({
      reply: "AI chat is not configured. Please set OPENROUTER_API_KEY in your environment variables to enable this feature.",
    })
  }

  const messages = [
    {
      role: "system",
      content: systemContext,
    },
    ...history.map((msg) => ({
      role: msg.role,
      content: msg.content.slice(0, 500),
    })),
    {
      role: "user",
      content: safeMessage,
    },
  ]

  const modelCandidates = [openRouterModel, openRouterFallbackModel]
    .filter((m): m is string => typeof m === "string" && m.trim().length > 0)

  try {
    let retryAfterSeconds: number | undefined
    let suggestedModel: string | undefined

    for (const model of modelCandidates) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...(appUrl ? { "HTTP-Referer": appUrl } : {}),
            "X-Title": "MOUAU Queue Assistant",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 300,
            temperature: 0.4,
          }),
        },
      )

      if (response.ok) {
        const result = await response.json()
        const reply = result.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response."
        return NextResponse.json({ reply })
      }

      const errText = await response.text()

      let errJson: any
      try {
        errJson = JSON.parse(errText)
      } catch {
        errJson = undefined
      }

      if (response.status === 429) {
        retryAfterSeconds = parseRetryDelaySeconds(response.headers.get("retry-after"), errJson)
        continue
      }

      if (response.status === 404) {
        suggestedModel = parseSuggestedModelFromError(errJson) || suggestedModel
        continue
      }

      if (response.status === 401) {
        return NextResponse.json({
          reply: "AI chat authentication failed. OPENROUTER_API_KEY is missing or invalid. Update your environment variables and restart the server.",
          degraded: true,
          reason: "invalid_api_key",
        })
      }

      throw new Error(`OpenRouter API error: ${response.status} ${errText}`)
    }

    if (suggestedModel) {
      return NextResponse.json({
        reply: `AI model configuration issue: one configured model is unavailable on free tier. Update OPENROUTER_FALLBACK_MODEL to ${suggestedModel}. For now, here is live queue guidance.\n\n${buildFallbackReply(officesWithData)}`,
        degraded: true,
        reason: "model_unavailable",
      })
    }

    return NextResponse.json({
      reply: buildFallbackReply(officesWithData, { quotaExceeded: true, retryAfterSeconds }),
      degraded: true,
      reason: "rate_limited",
      retryAfterSeconds,
    })
  } catch (e) {
    console.error("Chat API error:", e)
    return NextResponse.json({
      reply: buildFallbackReply(officesWithData),
      degraded: true,
      reason: "provider_error",
    })
  }
}

"use client"

import { useState, useRef, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Sparkles, Send, Bot, User, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="skeleton h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
              <div className="skeleton h-8 w-8 rounded-full shrink-0" />
              <div className={`skeleton h-20 w-3/4 rounded-2xl ${i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none"}`} />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your MOUAU queue assistant. Ask me anything about campus office queues — which offices are busy, wait times, opening hours, or the best time to visit.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingState, setLoadingState] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setLoadingState(false), 600)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Sorry, I couldn't process that." }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  if (loadingState) return <ChatSkeleton />

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AI Queue Assistant</h1>
            <p className="text-sm text-muted-foreground">Ask anything about campus office queues</p>
          </div>
        </div>

        <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-[65vh]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about queues, wait times, or office hours..."
            disabled={loading}
            className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-all hover:opacity-90 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Powered by OpenRouter AI &middot; Responses are based on recent queue data
        </p>
      </main>
    </div>
  )
}

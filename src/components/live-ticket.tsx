"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Nav } from "./nav"
import { Card, CardContent } from "./ui/card"
import { StatusBadge } from "./ui/badge"
import { useSupabase } from "./supabase-provider"
import { ChevronLeft, MapPin, Smartphone, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"
import type { TicketWithOffice } from "@/lib/types"

const statusFlow = ["waiting", "checked_in", "being_served", "served"] as const

function TicketSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="skeleton h-4 w-16 mb-4" />
        <div className="skeleton h-48 w-full rounded-lg mb-4" />
        <div className="skeleton h-16 w-full rounded-lg mb-4" />
        <div className="skeleton h-12 w-full rounded-lg mb-4" />
        <div className="skeleton h-48 w-full rounded-lg" />
      </main>
    </div>
  )
}

export function LiveTicket({ ticketId }: { ticketId: string }) {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketWithOffice | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const mountedRef = useRef(true)

  const loadTicket = useCallback(async () => {
    const { data } = await supabase
      .from("queue_entries")
      .select("*, offices(*)")
      .eq("id", ticketId)
      .single()
    if (mountedRef.current) {
      if (data) setTicket(data as unknown as TicketWithOffice)
      setLoading(false)
    }
  }, [supabase, ticketId])

  useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    setTicket(null)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return
      if (!session) { router.push("/auth/login"); return }
      loadTicket()
    })

    return () => { mountedRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries", filter: `id=eq.${ticketId}` }, (payload) => {
        loadTicket()
        const s = (payload.new as any).status
        if (s === "being_served") toast.success("You're now being served!")
        else if (s === "served") toast.success("Ticket served successfully!")
        else if (s === "skipped" || s === "cancelled") toast.info("Ticket has been " + s)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  async function handleCheckIn() {
    setCheckingIn(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/checkin`, { method: "PATCH" })
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Check-in failed"); setCheckingIn(false); return }
      toast.success("Checked in! You're ready to be served.")
      loadTicket()
      setCheckingIn(false)
    } catch { toast.error("Network error"); setCheckingIn(false) }
  }

  function getCurrentStep(): number {
    if (!ticket) return 0
    const idx = statusFlow.indexOf(ticket.status as typeof statusFlow[number])
    return idx >= 0 ? idx : 0
  }

  function getPeopleAhead(): number {
    if (!ticket) return 0
    return Math.max(0, ticket.position - 1)
  }

  if (loading) return <TicketSkeleton />

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Ticket not found.</p>
          <Link href="/" className="text-foreground underline">Back to dashboard</Link>
        </main>
      </div>
    )
  }

  const currentStep = getCurrentStep()
  const isDone = ["served", "skipped", "cancelled"].includes(ticket.status)
  const isWaiting = ticket.status === "waiting"

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-lg mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Link>

        <Card className="mb-4 text-center">
          <CardContent>
            <p className="text-xs text-muted-foreground mb-1">{ticket.offices.name}</p>
            <h1 className="text-3xl font-bold mb-1">{ticket.ticket_number}</h1>
            <StatusBadge status={ticket.status} />
            {!isDone && (
              <div className="mt-4 flex items-center justify-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-primary">{ticket.position}</p>
                  <p className="text-xs text-muted-foreground">Position</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-2xl font-bold text-primary">{getPeopleAhead()}</p>
                  <p className="text-xs text-muted-foreground">Ahead of you</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent>
            <div className="flex items-center justify-between">
              {statusFlow.map((status, idx) => (
                <div key={status} className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: idx <= currentStep ? "#16a34a" : "#d1d5db" }} />
                  <span className="text-[10px] capitalize" style={{ color: idx <= currentStep ? "#16a34a" : "#9ca3af" }}>
                    {status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isWaiting && (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm mb-4 flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
          >
            {checkingIn ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking in...
              </span>
            ) : (
              <><MapPin className="w-4 h-4" /> I&apos;ve Arrived (Check In)</>
            )}
          </button>
        )}

        {isWaiting && (
          <Card>
            <CardContent className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Scan at the office door to check in</p>
              <div className="flex justify-center">
                <QRCodeSVG value={`${process.env.NEXT_PUBLIC_APP_URL}/checkin/${ticket.offices.qr_code_token}?ticket=${ticket.id}`} size={140} level="M" />
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                <Smartphone className="w-3 h-3" /> Show this code at the office
              </div>
            </CardContent>
          </Card>
        )}

        {isDone && (
          <Card>
            <CardContent className="text-center text-sm text-muted-foreground">
              {ticket.status === "served" ? "You have been served. Thank you!" :
               ticket.status === "skipped" ? "Your ticket was skipped. Please rejoin the queue." :
               "Your ticket was cancelled."}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

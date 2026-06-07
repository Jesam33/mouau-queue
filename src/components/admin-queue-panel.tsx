"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "./supabase-provider"
import { Card, CardContent, CardHeader } from "./ui/card"
import { StatusBadge } from "./ui/badge"
import type { QueueEntry } from "@/lib/types"
import { toast } from "sonner"
import { UserPlus, LogOut, Loader2 } from "lucide-react"

function QueueSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-3 max-w-4xl mx-auto">
        <div className="skeleton h-5 w-40 mb-1" />
        <div className="skeleton h-3 w-24" />
      </div>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="skeleton h-10 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((col) => (
            <div key={col}>
              <div className="skeleton h-5 w-36 mb-3" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-28 w-full mb-2 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export function AdminQueuePanel() {
  const { supabase, profile, setProfile } = useSupabase()
  const router = useRouter()
  const [checkedIn, setCheckedIn] = useState<QueueEntry[]>([])
  const [waiting, setWaiting] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showWalkin, setShowWalkin] = useState(false)
  const [walkinName, setWalkinName] = useState("")
  const [walkinMatric, setWalkinMatric] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    if (!profile?.office_id) return
    const { data } = await supabase
      .from("queue_entries")
      .select("*, profiles(full_name, matric_number, department, level)")
      .eq("office_id", profile.office_id)
      .in("status", ["waiting", "checked_in", "being_served"])
      .order("position", { ascending: true })

    if (data) {
      setCheckedIn(data.filter((t: any) => t.status === "checked_in" || t.status === "being_served"))
      setWaiting(data.filter((t: any) => t.status === "waiting"))
    }
    setLoading(false)
  }, [supabase, profile?.office_id])

  useEffect(() => {
    if (!profile) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push("/admin"); return }
        supabase.from("profiles").select("*").eq("id", session.user.id).single()
          .then(({ data }) => {
            if (!data) { router.push("/admin"); return }
            setProfile(data as any)
            if (data.role !== "admin") { supabase.auth.signOut(); router.push("/"); return }
            loadQueue()
          })
      })
      return
    }
    if (profile.role !== "admin") { supabase.auth.signOut(); router.push("/"); return }
    loadQueue()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  useEffect(() => {
    if (!profile?.office_id) return
    const channel = supabase
      .channel(`admin-queue-${profile.office_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries", filter: `office_id=eq.${profile.office_id}` }, () => loadQueue())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.office_id])

  async function handleAction(ticketId: string, action: "serve" | "skip" | "cancel") {
    setActionLoading(`${ticketId}-${action}`)
    const res = await fetch(`/api/admin/tickets/${ticketId}/${action}`, { method: "PATCH" })
    if (!res.ok) { const err = await res.json(); toast.error(err.error || "Action failed"); setActionLoading(null); return }
    toast.success(`Ticket ${action}d successfully`)
    setActionLoading(null)
    loadQueue()
  }

  async function handleWalkin(e: React.FormEvent) {
    e.preventDefault()
    if (!walkinName && !walkinMatric) { toast.error("Please enter name or matric number"); return }
    setSubmitting(true)
    const res = await fetch("/api/admin/tickets/walkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: walkinName, matric_number: walkinMatric || undefined }),
    })
    if (!res.ok) { const err = await res.json(); toast.error(err.error || "Failed to add walk-in"); setSubmitting(false); return }
    toast.success("Walk-in student added")
    setWalkinName(""); setWalkinMatric(""); setShowWalkin(false); setSubmitting(false)
    loadQueue()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setProfile(null)
    router.push("/admin")
    router.refresh()
  }

  if (loading) return <QueueSkeleton />

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="font-bold">Admin Queue Panel</h1>
          <p className="text-xs text-muted-foreground">{profile?.full_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/analytics")} className="text-sm text-muted-foreground hover:text-foreground">
            Analytics
          </button>
          <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Live Queue</h2>
          <button onClick={() => setShowWalkin(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-all hover:opacity-90">
            <UserPlus className="w-4 h-4" /> Add Walk-in
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Ready to Serve ({checkedIn.length})
            </h3>
            <div className="space-y-2">
              {checkedIn.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No students checked in yet</p>
              )}
              {checkedIn.map((ticket) => (
                <Card key={ticket.id} className={ticket.status === "being_served" ? "ring-2 ring-primary" : ""}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{ticket.ticket_number}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm">{(ticket.profiles as any)?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {(ticket.profiles as any)?.matric_number || ""}
                      {(ticket.profiles as any)?.department ? ` · ${(ticket.profiles as any).department}` : ""}
                    </p>
                    {ticket.status === "checked_in" && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleAction(ticket.id, "serve")} disabled={actionLoading === `${ticket.id}-serve`} className="flex-1 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50 transition-all hover:opacity-90">
                          {actionLoading === `${ticket.id}-serve` ? <span className="flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Serving...</span> : "Serve Next"}
                        </button>
                        <button onClick={() => handleAction(ticket.id, "skip")} disabled={actionLoading === `${ticket.id}-skip`} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-xs disabled:opacity-50">
                          {actionLoading === `${ticket.id}-skip` ? "Skipping..." : "Skip"}
                        </button>
                        <button onClick={() => handleAction(ticket.id, "cancel")} disabled={actionLoading === `${ticket.id}-cancel`} className="px-3 py-1.5 bg-muted text-muted-foreground rounded text-xs disabled:opacity-50">
                          {actionLoading === `${ticket.id}-cancel` ? "Cancelling..." : "Cancel"}
                        </button>
                      </div>
                    )}
                    {ticket.status === "being_served" && (
                      <button onClick={() => handleAction(ticket.id, "serve")} disabled={actionLoading === `${ticket.id}-serve`} className="w-full mt-2 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50 transition-all hover:opacity-90">
                        {actionLoading === `${ticket.id}-serve` ? <span className="flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Marking...</span> : "Mark as Done"}
                      </button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              Still Coming ({waiting.length})
            </h3>
            <div className="space-y-2">
              {waiting.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No one waiting to join</p>
              )}
              {waiting.map((ticket) => (
                <Card key={ticket.id}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{ticket.ticket_number}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm">{(ticket.profiles as any)?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {(ticket.profiles as any)?.matric_number || ""} · #{ticket.position} in line
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleAction(ticket.id, "cancel")} disabled={actionLoading === `${ticket.id}-cancel`} className="flex-1 py-1.5 bg-muted text-muted-foreground rounded text-xs disabled:opacity-50">
                        {actionLoading === `${ticket.id}-cancel` ? "Cancelling..." : "Cancel"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showWalkin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><h3 className="font-bold">Add Walk-in Student</h3></CardHeader>
            <CardContent>
              <form onSubmit={handleWalkin} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input type="text" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Student's full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Matric Number</label>
                  <input type="text" value={walkinMatric} onChange={(e) => setWalkinMatric(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowWalkin(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                    {submitting ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

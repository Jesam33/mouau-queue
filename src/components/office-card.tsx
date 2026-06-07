"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "./ui/card"
import { useSupabase } from "./supabase-provider"
import { Building2, Wallet, FileText, Users, Monitor, BookOpen, Landmark, Globe, Loader2, UsersRound, Clock, LogIn, UserPlus, X } from "lucide-react"
import type { OfficeWithMetrics } from "@/lib/types"
import Link from "next/link"

const iconMap: Record<string, React.ElementType> = {
  Building2, Wallet, FileText, Users, Monitor, BookOpen, Landmark, Globe,
  Building: Building2,
}

const iconLabels: Record<string, string> = {
  Building2: "Admin",
  Wallet: "Finance",
  FileText: "Records",
  Users: "Student",
  Monitor: "ICT",
  BookOpen: "Library",
  Landmark: "Main",
  Globe: "Portal",
}

function CongestionDot({ level }: { level: string }) {
  const shades: Record<string, string> = {
    Low: '#22c55e',
    Moderate: '#eab308',
    High: '#ea580c',
    Critical: '#dc2626',
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="w-2 h-2 rounded-full inline-block"
        style={{ backgroundColor: shades[level] || '#22c55e' }}
      />
      {level}
    </span>
  )
}

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative bg-card rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold text-lg">Student Login Required</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in or create an account to join the queue and track your ticket.
          </p>
        </div>

        <div className="space-y-2.5">
          <Link
            href="/auth/login"
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-sm"
          >
            <LogIn className="w-4 h-4" /> Login
          </Link>
          <Link
            href="/auth/register"
            className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Register
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  )
}

export function OfficeCard({ office }: { office: OfficeWithMetrics }) {
  const router = useRouter()
  const { profile } = useSupabase()
  const [navigating, setNavigating] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const Icon = iconMap[office.icon] || Building2
  const iconLabel = iconLabels[office.icon] || "Office"
  const fullness = Math.min((office.queue_count / office.capacity) * 100, 100)
  const barColor = fullness < 50 ? "bg-green-500" : fullness < 80 ? "bg-yellow-500" : "bg-red-500"

  function handleClick() {
    if (!profile) {
      setShowLogin(true)
      return
    }
    setNavigating(true)
    router.push(`/office/${office.id}`)
  }

  return (
    <div className="relative">
      <Card
        onClick={handleClick}
        className="card-hover cursor-pointer h-full border overflow-hidden group"
      >
        <div className="h-1 bg-gradient-to-r from-primary from-50% via-accent to-primary" />
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight">{office.name}</h3>
              <CongestionDot level={office.congestion_level} />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {iconLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted/50 rounded-lg py-2.5">
              <UsersRound className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-center text-foreground">{office.queue_count}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider text-center">Queue</p>
            </div>
            <div className="bg-muted/50 rounded-lg py-2.5">
              <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-center text-foreground">
                {office.estimated_wait_minutes > 0 ? `~${office.estimated_wait_minutes}` : "0"}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider text-center">Wait</p>
            </div>
            <div className="bg-muted/50 rounded-lg py-2.5">
              <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-center text-foreground">{office.capacity}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider text-center">Capacity</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${barColor}`}
                style={{ width: `${fullness}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
              {Math.round(fullness)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {navigating && (
        <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  )
}

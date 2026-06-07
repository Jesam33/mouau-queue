"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function CheckInPage({ params }: { params: { qr_token: string } }) {
  const { supabase, profile } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!profile) {
      router.push(`/auth/login?redirect=/checkin/${params.qr_token}`)
      return
    }
    doCheckIn()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function doCheckIn() {
    const ticketId = searchParams.get("ticket")

    if (!ticketId) {
      const { data: office } = await supabase
        .from("offices")
        .select("id, name")
        .eq("qr_code_token", params.qr_token)
        .single()

      if (!office) {
        setStatus("error")
        setMessage("Invalid QR code. This office does not exist.")
        return
      }

      const { data: existing } = await supabase
        .from("queue_entries")
        .select("id")
        .eq("student_id", profile!.id)
        .eq("office_id", office.id)
        .in("status", ["waiting", "checked_in"])
        .single()

      if (existing) {
        await supabase
          .from("queue_entries")
          .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
          .eq("id", existing.id)

        setStatus("success")
        setMessage(`Checked in at ${office.name}!`)
        setTimeout(() => router.push(`/ticket/${existing.id}`), 1500)
      } else {
        router.push(`/office/${office.id}`)
      }
      return
    }

    const { error } = await supabase
      .from("queue_entries")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("student_id", profile!.id)

    if (error) {
      setStatus("error")
      setMessage("Failed to check in. Please try again.")
      return
    }

    setStatus("success")
    setMessage("You've been checked in successfully!")
    setTimeout(() => router.push(`/ticket/${ticketId}`), 1500)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Checking you in...</p>
          </div>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}

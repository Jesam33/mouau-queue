import { LiveTicket } from "@/components/live-ticket"

export const dynamic = "force-dynamic"

export default function TicketPage({ params }: { params: { id: string } }) {
  return <LiveTicket ticketId={params.id} />
}

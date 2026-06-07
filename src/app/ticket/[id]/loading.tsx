import { Nav } from "@/components/nav"

export default function TicketLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="skeleton h-4 w-16 mb-4" />
        <div className="skeleton h-48 w-full rounded-xl mb-4" />
        <div className="skeleton h-16 w-full rounded-xl mb-4" />
        <div className="skeleton h-12 w-full rounded-xl mb-4" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </main>
    </div>
  )
}

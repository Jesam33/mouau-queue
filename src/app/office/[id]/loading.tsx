import { Nav } from "@/components/nav"

export default function OfficeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="bg-gradient-to-r from-primary/90 via-primary/80 to-accent/80">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="skeleton h-4 w-32 bg-white/20 mb-3" />
          <div className="flex items-start gap-4">
            <div className="skeleton h-14 w-14 rounded-xl bg-white/20" />
            <div className="flex-1">
              <div className="skeleton h-6 w-48 mb-2 bg-white/20" />
              <div className="skeleton h-4 w-36 bg-white/20" />
            </div>
          </div>
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-10 w-full rounded-xl mb-6" />
        <div className="skeleton h-32 w-full rounded-xl mb-6" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </main>
    </div>
  )
}

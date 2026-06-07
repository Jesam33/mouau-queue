import { cn } from "@/lib/utils"

const CONGESTION_SHADES: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#eab308',
  High: '#ea580c',
  Critical: '#dc2626',
}

export function CongestionBadge({ level }: { level: string }) {
  const bg = CONGESTION_SHADES[level] || '#22c55e'
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: bg }}
    >
      {level}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    checked_in: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    being_served: "bg-green-700 text-white",
    served: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
    skipped: "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
    cancelled: "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        map[status] || map.waiting
      )}
    >
      {status.replace("_", " ")}
    </span>
  )
}

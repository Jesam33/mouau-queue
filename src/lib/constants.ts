export const QUEUE_STATUS_COLORS = {
  waiting: '#6b7280',
  checked_in: '#16a34a',
  being_served: '#15803d',
  served: '#9ca3af',
  skipped: '#d1d5db',
  cancelled: '#d1d5db',
} as const

export const AVG_SERVICE_MINUTES = 3

export const PREDICTION_CACHE_TTL = 60 * 60 * 1000

import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(date))
}

export function formatDateFull(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return formatDate(d)
}

export function getCurrentHour(): number {
  return new Date().getHours()
}

export function getDayOfWeek(): number {
  return new Date().getDay()
}

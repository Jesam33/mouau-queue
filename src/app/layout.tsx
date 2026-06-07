import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { SupabaseProvider } from "@/components/supabase-provider"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MOUAU Smart Queue - Queue Management System",
  description: "View real-time queue status for administrative offices at Michael Okpara University of Agriculture, Umudike.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SupabaseProvider>
            {children}
            <Toaster position="top-center" richColors />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

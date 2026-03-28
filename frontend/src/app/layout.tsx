import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zenith',
  description: 'Browser based agent coding editor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased h-screen overflow-hidden m-0 p-0 text-white bg-black">
        {children}
      </body>
    </html>
  )
}

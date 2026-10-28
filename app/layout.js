import './globals.css'
export const metadata = {
  title: 'CRM Progress',
  description: 'CRM для PROGRESS BUSINESS SCHOOL',
  manifest: '/manifest.json',
}
export const viewport = { themeColor: '#17233f' }
export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}

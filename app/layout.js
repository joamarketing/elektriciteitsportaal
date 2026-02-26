import './globals.css'

export const metadata = {
  title: 'Energieportaal',
  description: 'Beheer en verdeling van elektriciteitskosten',
  manifest: '/manifest.json',
  themeColor: '#0C0F14',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Energieportaal',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <div className="grid-bg" />
        <div className="glow glow-orange" />
        <div className="glow glow-blue" />
        {children}
      </body>
    </html>
  )
}

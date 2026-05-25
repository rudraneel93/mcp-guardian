import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MCP Guardian — SOC Dashboard',
  description: 'Enterprise-grade MCP Security Proxy — Security Operations Center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#06090E', height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}

export const metadata = {
  title: 'Neko Downloader API',
  description: 'Small utilities API with downloader & metadata – Vercel ready',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'Inter, system-ui, Arial', background: '#0b0d13', color: '#e2e8f0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}

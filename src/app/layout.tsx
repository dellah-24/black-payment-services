import type { ReactNode } from 'react';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Navigation } from '@/components/Navigation';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BlackPayments - Crypto Payment Gateway</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-[#070a12] text-white antialiased">
        <ErrorBoundary>
          <ToastProvider>
            <Navigation />
            <main className="min-h-screen">{children}</main>

            <footer className="border-t border-white/10 bg-[#070a12]/80">
              <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                <p>© 2026 BlackPayments. Crypto checkout infrastructure.</p>
                <div className="flex flex-wrap gap-5">
                  <a href="#" className="transition hover:text-white">Terms</a>
                  <a href="#" className="transition hover:text-white">Privacy</a>
                  <a href="#" className="transition hover:text-white">Docs</a>
                  <a href="#" className="transition hover:text-white">Support</a>
                </div>
              </div>
            </footer>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Contract mail API',
  description: 'Resend-powered contract notification API',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        {children}
      </body>
    </html>
  );
}

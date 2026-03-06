import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Club10 Pool — Investment Pool Manager',
  description: 'Automated investment pool management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

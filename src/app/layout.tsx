import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FleetPro | Fleet Management Web Application',
  description: 'Enterprise fleet management system for drivers and fleet administrators connected to Supabase.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full flex flex-col antialiased text-slate-900 bg-slate-50 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}

import React from 'react';
import { Navbar } from '@/components/shared/Navbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        FleetPro Administration Portal &bull; Timezone: Asia/Kolkata (IST) &bull; Supabase Backend Ready
      </footer>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FleetStore } from '@/lib/store';
import { Profile } from '@/types';
import { INITIAL_ADMIN, INITIAL_DRIVERS } from '@/lib/mockData';
import {
  Truck,
  Users,
  Building2,
  FileSpreadsheet,
  Gauge,
  LogOut,
  UserCheck,
  ShieldAlert,
  Menu,
  X,
  Compass,
  Repeat,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(FleetStore.getCurrentUser());
  }, [pathname]);

  const isAdmin = currentUser?.role === 'ADMIN' || pathname.startsWith('/admin');

  const handleSwitchRole = () => {
    if (isAdmin) {
      FleetStore.setCurrentUser(INITIAL_DRIVERS[0]);
      router.push('/driver');
    } else {
      FleetStore.setCurrentUser(INITIAL_ADMIN);
      router.push('/admin');
    }
  };

  const handleLogout = () => {
    FleetStore.logout();
    router.push('/login');
  };

  const adminNavItems = [
    { label: 'Overview', href: '/admin', icon: <Gauge className="w-4 h-4" /> },
    { label: 'Drivers', href: '/admin/drivers', icon: <Users className="w-4 h-4" /> },
    { label: 'Vehicles', href: '/admin/vehicles', icon: <Truck className="w-4 h-4" /> },
    { label: 'Companies', href: '/admin/companies', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Reports', href: '/admin/reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  const driverNavItems = [
    { label: 'Driver Dashboard', href: '/driver', icon: <Compass className="w-4 h-4" /> },
    { label: 'My Trip History', href: '/driver/history', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  const navItems = isAdmin ? adminNavItems : driverNavItems;

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LOGO & BRAND */}
          <div className="flex items-center gap-8">
            <Link href={isAdmin ? '/admin' : '/driver'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1">
                  FLEET<span className="text-blue-600">PRO</span>
                </span>
                <span className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  IST (UTC+05:30)
                </span>
              </div>
            </Link>

            {/* DESKTOP NAV LINKS */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-xs border border-blue-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* RIGHT ACTIONS: ROLE BADGE, SWITCHER, PROFILE */}
          <div className="hidden sm:flex items-center gap-3">
            {/* ROLE BADGE */}
            <Badge
              variant={isAdmin ? 'purple' : 'success'}
              size="md"
              className="gap-1.5 font-bold"
            >
              {isAdmin ? <ShieldAlert className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {isAdmin ? 'ADMIN PORTAL' : 'DRIVER PORTAL'}
            </Badge>

            {/* QUICK ROLE SWITCHER FOR DEMO / EVALUATION */}
            <button
              onClick={handleSwitchRole}
              title="Quickly toggle between Admin and Driver view"
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Switch to {isAdmin ? 'Driver' : 'Admin'}</span>
            </button>

            {/* USER INFO */}
            <div className="text-right pl-2 border-l border-slate-200">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.full_name || (isAdmin ? 'Admin' : 'Driver')}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentUser?.phone || 'Fleet Associate'}
              </div>
            </div>

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* MOBILE MENU TOGGLE */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={handleSwitchRole}
              className="p-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              {isAdmin ? 'Driver Mode' : 'Admin Mode'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE NAV DROPDOWN */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-4 space-y-2 animate-fadeIn">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <Badge variant={isAdmin ? 'purple' : 'success'} size="sm">
              {isAdmin ? 'ADMIN' : 'DRIVER'}
            </Badge>
            <span className="text-xs text-slate-500">{currentUser?.full_name}</span>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleSwitchRole}
              className="text-xs text-blue-600 font-semibold py-1.5 flex items-center gap-1"
            >
              <Repeat className="w-3.5 h-3.5" />
              Switch to {isAdmin ? 'Driver' : 'Admin'}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-rose-600 font-semibold py-1.5 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

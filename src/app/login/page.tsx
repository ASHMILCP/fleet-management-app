'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { FleetStore } from '@/lib/store';
import { Profile } from '@/types';
import { INITIAL_ADMIN } from '@/lib/mockData';
import { Truck, Key, UserCheck, ShieldCheck, Lock, Smartphone, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePwa } from '@/components/pwa/PwaContext';

export default function LoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { openInstallModal, isInstalled, isIos } = usePwa();
  const isLiveSupabase = isLiveSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const inputUser = usernameOrEmail.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg('Please enter both Username/Email and Password');
      setIsLoading(false);
      return;
    }

    const getDeviceInfo = () => {
      if (typeof navigator === 'undefined') return 'Web Browser';
      const ua = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
      const isPwa = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      let os = 'Device';
      if (/iPhone|iPad|iPod/i.test(ua)) os = 'Apple iOS';
      else if (/Android/i.test(ua)) os = 'Android';
      else if (/Mac/i.test(ua)) os = 'Mac Desktop';
      else if (/Windows/i.test(ua)) os = 'Windows PC';
      else if (/Linux/i.test(ua)) os = 'Linux';

      return `${os} ${isMobile ? 'Mobile' : ''} ${isPwa ? '• Installed PWA' : '• Browser'}`.trim();
    };

    // 1. Instant check for Admin account
    const admin = FleetStore.getAdminProfile();
    const adminUserMatch =
      admin.username?.toLowerCase() === inputUser.toLowerCase() ||
      (inputUser.toLowerCase() === 'admin' && admin.username?.toLowerCase() === 'admin');
    const adminPassMatch = admin.password === inputPass;
    if (adminUserMatch && adminPassMatch) {
      FleetStore.setCurrentUser(admin);
      FleetStore.recordLoginAuditAsync(admin, { device: getDeviceInfo() });
      router.push('/admin');
      setIsLoading(false);
      return;
    }

    // 2. Direct Supabase Cloud Database check (fastest, works on mobile & desktop for all created drivers)
    const dbUser = await FleetStore.authenticateUserAsync(inputUser, inputPass);
    if (dbUser) {
      FleetStore.setCurrentUser(dbUser);
      FleetStore.recordLoginAuditAsync(dbUser, { device: getDeviceInfo() });
      router.push(dbUser.role === 'ADMIN' ? '/admin' : '/driver');
      setIsLoading(false);
      return;
    }

    // 3. Supabase Auth fallback (for accounts registered in Supabase Auth console)
    if (isLiveSupabase) {
      try {
        const supabase = createClient();
        const candidateEmails = inputUser.includes('@')
          ? [inputUser]
          : [
              `${inputUser}@fleetpro.in`,
              `${inputUser}@fleetapp.com`,
              `${inputUser.toLowerCase()}@fleetapp.com`,
            ];

        for (const email of candidateEmails) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: inputPass,
          });

          if (!error && data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            // If the profile does not exist in profiles table, or is inactive, the admin removed them!
            if (!profile || (profile.status && profile.status !== 'ACTIVE')) {
              await supabase.auth.signOut();
              setErrorMsg('This driver account has been removed by the admin.');
              setIsLoading(false);
              return;
            }

            if (profile.role === 'DRIVER') {
              const { data: drvCheck } = await supabase.from('drivers').select('id').eq('id', profile.id).maybeSingle();
              if (!drvCheck) {
                await supabase.from('drivers').upsert({
                  id: profile.id,
                  user_id: profile.id,
                  driver_id_code: 'DRV-' + profile.id.slice(0, 6).toUpperCase(),
                  status: 'ACTIVE',
                });
              }
            }

            const userProfile: Profile = {
              id: profile.id,
              role: (profile.role as 'ADMIN' | 'DRIVER') || 'DRIVER',
              full_name: profile.name || profile.full_name || inputUser,
              phone: profile.phone,
              is_active: true,
              created_at: profile.created_at || new Date().toISOString(),
            };

            FleetStore.setCurrentUser(userProfile);
            FleetStore.recordLoginAuditAsync(userProfile, { device: getDeviceInfo() });
            router.push(userProfile.role === 'ADMIN' ? '/admin' : '/driver');
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Supabase auth fallback error:', err);
      }
    }

    setErrorMsg('Invalid Username or Password. Please check your credentials.');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-4">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          FLEET<span className="text-blue-500">PRO</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Smart Fleet Tracking &amp; Driver Operations Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your assigned username/email and password
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="e.g. ramesh or admin"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500 font-mono"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3"
              isLoading={isLoading}
              leftIcon={<Key className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* INSTALL AS WEB APP OPTION */}
          {!isInstalled && (
            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={openInstallModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all shadow-xs hover:border-blue-500/50"
              >
                {isIos ? (
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>Add FleetPro to Mobile Home Screen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

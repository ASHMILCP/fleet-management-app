'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { FleetStore } from '@/lib/store';
import { Truck, Key, UserCheck, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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

    if (isLiveSupabase) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: inputUser.includes('@') ? inputUser : `${inputUser}@fleetpro.in`,
          password: inputPass,
        });

        if (!error && data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile?.role === 'ADMIN') {
            FleetStore.setCurrentUser(profile);
            router.push('/admin');
          } else {
            FleetStore.setCurrentUser(profile);
            router.push('/driver');
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // Fallback to local store authentication below
      }
    }

    // Local / Store Authentication Check
    const user = FleetStore.authenticateUser(inputUser, inputPass);
    if (user) {
      FleetStore.setCurrentUser(user);
      if (user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/driver');
      }
    } else {
      setErrorMsg('Invalid Username or Password. Please check your credentials.');
    }
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
        </div>
      </div>
    </div>
  );
}

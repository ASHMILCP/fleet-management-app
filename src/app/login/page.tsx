'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { FleetStore } from '@/lib/store';
import { INITIAL_DRIVERS, INITIAL_ADMIN } from '@/lib/mockData';
import { Truck, Shield, User, ArrowRight, CheckCircle2, Sparkles, Key } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const isLiveSupabase = isLiveSupabaseConfigured();

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    if (!isLiveSupabase) {
      // Demo fallback mode
      if (email.toLowerCase().includes('admin')) {
        FleetStore.setCurrentUser(INITIAL_ADMIN);
        router.push('/admin');
      } else {
        FleetStore.setCurrentUser(INITIAL_DRIVERS[0]);
        router.push('/driver');
      }
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Fetch role from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'ADMIN') {
          FleetStore.setCurrentUser(profile);
          router.push('/admin');
        } else {
          FleetStore.setCurrentUser(profile || INITIAL_DRIVERS[0]);
          router.push('/driver');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoDriver = () => {
    FleetStore.setCurrentUser(INITIAL_DRIVERS[0]);
    router.push('/driver');
  };

  const handleQuickDemoAdmin = () => {
    FleetStore.setCurrentUser(INITIAL_ADMIN);
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Glows */}
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
          Smart Fleet Tracking &amp; Driver Shift Operations
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
          <span>Timezone: Asia/Kolkata (IST)</span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          {/* QUICK DEMO LOGIN BUTTONS */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant One-Click Login</span>
            </div>

            <button
              onClick={handleQuickDemoDriver}
              type="button"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold text-sm shadow-md hover:shadow-lg shadow-emerald-700/20 hover:scale-[1.01] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">Login as Driver</div>
                  <div className="text-xs text-emerald-100 font-normal">
                    Ramesh Kumar (Maruti Dzire CNG)
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleQuickDemoAdmin}
              type="button"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg shadow-indigo-700/20 hover:scale-[1.01] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">Login as Admin</div>
                  <div className="text-xs text-indigo-100 font-normal">
                    Fleet Administrator (Full CRUD &amp; Reports)
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-3 text-slate-400 font-semibold">
                Or Supabase Email Auth
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSupabaseLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@fleetpro.in or admin@fleetpro.in"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
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
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              leftIcon={<Key className="w-4 h-4" />}
            >
              Sign In with Supabase
            </Button>
          </form>

          {/* SUPABASE STATUS FOOTER */}
          <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Supabase Connection:</span>
            {isLiveSupabase ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Connected
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Interactive Demo Mode
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

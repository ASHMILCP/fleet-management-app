'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FleetStore } from '@/lib/store';
import { AdminSummaryMetrics, DutySession, Profile, Vehicle } from '@/types';
import { formatTimeIST, formatCurrencyINR, getTodayDateIST } from '@/lib/timezone';
import { StatCard } from '@/components/admin/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Users,
  Truck,
  Building2,
  Navigation,
  Fuel,
  Gauge,
  TrendingUp,
  Clock,
  Car,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { AdminProfileModal } from '@/components/admin/AdminProfileModal';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminSummaryMetrics>({
    totalDrivers: 0,
    activeDrivers: 0,
    onDutyDrivers: 0,
    todayTrips: 0,
    todayKm: 0,
    todayFuelExpense: 0,
    todayFuelCostPerKm: 0,
  });
  const [activeSessions, setActiveSessions] = useState<DutySession[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      await FleetStore.syncWithSupabase();
      const [data, allSessions] = await Promise.all([
        FleetStore.fetchAdminMetricsAsync(),
        FleetStore.fetchDutySessionsAsync(),
      ]);
      setMetrics(data);
      setActiveSessions(allSessions.filter((s) => s.status === 'ACTIVE' || !s.end_time));

      setDrivers(FleetStore.getDrivers());
      setVehicles(FleetStore.getVehicles());
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 15s so driver entries from mobile reflect automatically
    const interval = setInterval(loadDashboardData, 15000);
    const handleFocus = () => loadDashboardData();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <div className="space-y-6">
      {/* 1. WELCOME & TIMEZONE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Fleet Operations Control Center
            </h1>
            <Badge variant="purple" size="md">
              <ShieldCheck className="w-3.5 h-3.5" />
              ADMIN
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Operational Date: <strong>{getTodayDateIST()}</strong></span>
            </span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span>Standard Timezone: <strong>Asia/Kolkata (IST)</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdminModalOpen(true)}
            leftIcon={<KeyRound className="w-4 h-4 text-purple-600" />}
          >
            Admin Account
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            {isRefreshing ? 'Syncing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS (ALL 7 REQUIRED BY SPEC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Drivers */}
        <StatCard
          title="Total Drivers"
          value={metrics.totalDrivers}
          subtitle="Registered in fleet directory"
          icon={<Users className="w-5 h-5" />}
          variant="slate"
        />

        {/* Active Drivers */}
        <StatCard
          title="Active Drivers"
          value={metrics.activeDrivers}
          subtitle="Eligible for assignments"
          icon={<Users className="w-5 h-5" />}
          trend={`${Math.round((metrics.activeDrivers / Math.max(1, metrics.totalDrivers)) * 100)}% available`}
          variant="blue"
        />

        {/* On-Duty Drivers */}
        <StatCard
          title="On-Duty Drivers"
          value={metrics.onDutyDrivers}
          subtitle="Currently active shifts"
          icon={<Clock className="w-5 h-5" />}
          trend={metrics.onDutyDrivers > 0 ? 'Live on road' : 'Off-duty'}
          variant="emerald"
        />

        {/* Today's Trips */}
        <StatCard
          title="Today's Trips"
          value={metrics.todayTrips}
          subtitle="Completed client trips"
          icon={<Navigation className="w-5 h-5" />}
          variant="purple"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's KM */}
        <StatCard
          title="Today's KM Logged"
          value={`${metrics.todayKm.toFixed(1)} KM`}
          subtitle="Total fleet distance traveled"
          icon={<Gauge className="w-5 h-5" />}
          variant="blue"
        />

        {/* Today's Fuel Expense */}
        <StatCard
          title="Today's Fuel Expense"
          value={formatCurrencyINR(metrics.todayFuelExpense)}
          subtitle="Total CNG & Petrol spend today"
          icon={<Fuel className="w-5 h-5" />}
          variant="amber"
        />

        {/* Today's Fuel Cost / KM */}
        <StatCard
          title="Fuel Cost / KM"
          value={`₹${metrics.todayFuelCostPerKm.toFixed(2)} /KM`}
          subtitle={
            metrics.todayKm > 0
              ? `₹${metrics.todayFuelExpense} ÷ ${metrics.todayKm.toFixed(1)} km`
              : 'Fleet efficiency ratio'
          }
          icon={<TrendingUp className="w-5 h-5" />}
          variant="rose"
        />

        {/* Today's Fleet Revenue */}
        <StatCard
          title="Today's Fleet Revenue"
          value={formatCurrencyINR(metrics.todayTotalEarnings || 0)}
          subtitle={
            metrics.todayUberEarnings && metrics.todayUberEarnings > 0
              ? `Includes ${formatCurrencyINR(metrics.todayUberEarnings)} Uber`
              : 'Corporate trips & Uber earnings'
          }
          icon={<Car className="w-5 h-5 text-emerald-500" />}
          variant="emerald"
        />
      </div>

      {/* 3. LIVE ON-DUTY SHIFTS & FLEET HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Active Duty Sessions */}
        <div className="lg:col-span-2">
          <Card
            title={
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-slate-900">
                  Live Active Shifts ({activeSessions.length})
                </span>
              </div>
            }
            subtitle="Drivers currently on road with open duty sessions"
          >
            {activeSessions.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="text-sm font-semibold text-slate-600">No active shifts right now</p>
                <p className="text-xs text-slate-400 mt-1">
                  When drivers click &ldquo;Start Duty&rdquo; in their dashboard, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeSessions.map((session) => {
                  const driver = driverMap.get(session.driver_id);
                  const vehicle = session.vehicle_id ? vehicleMap.get(session.vehicle_id) : undefined;
                  return (
                    <div
                      key={session.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 rounded-xl px-2 sm:px-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
                          {driver?.full_name?.charAt(0) || 'D'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {driver?.full_name || 'Driver'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span>Phone: {driver?.phone || 'N/A'}</span>
                            {vehicle && (
                              <>
                                <span className="text-slate-300">&bull;</span>
                                <span className="font-mono text-slate-700 font-semibold">
                                  {vehicle.registration_number}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-t-0 pl-13 sm:pl-0">
                        <Badge variant="warning" size="sm">
                          ON DUTY
                        </Badge>
                        <div className="text-xs text-slate-500 mt-0.5 sm:mt-1">
                          Started: <strong className="font-mono text-slate-800">{formatTimeIST(session.start_time)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* QUICK MANAGEMENT LINKS */}
        <div className="space-y-4">
          <Card
            title="Entity Management"
            subtitle="Configure drivers, fleet vehicles, and client companies"
          >
            <div className="space-y-3">
              <Link
                href="/admin/drivers"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Drivers</div>
                    <div className="text-xs text-slate-500">
                      {metrics.totalDrivers} drivers registered
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/admin/vehicles"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Vehicles</div>
                    <div className="text-xs text-slate-500">
                      {vehicles.length} fleet vehicles
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/admin/companies"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Companies</div>
                    <div className="text-xs text-slate-500">
                      Client rate &amp; contact directory
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/admin/reports"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Reports &amp; Export</div>
                    <div className="text-xs text-slate-500">
                      Filter &amp; export to Excel, CSV, PDF
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
      {/* ADMIN PROFILE MODAL */}
      <AdminProfileModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSaved={loadDashboardData}
      />
    </div>
  );
}

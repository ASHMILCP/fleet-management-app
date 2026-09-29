'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FleetStore } from '@/lib/store';
import { AdminSummaryMetrics, DutySession, Profile, Vehicle, Company, Trip, DetailedReportItem } from '@/types';
import { formatTimeIST, formatCurrencyINR, getTodayDateIST } from '@/lib/timezone';
import { deleteTripAction } from '@/actions/trips';
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
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { AdminProfileModal } from '@/components/admin/AdminProfileModal';
import { EditTripModal } from '@/components/admin/EditTripModal';
import { subscribeToDutyNotifications } from '@/lib/notifications';

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [editingTripReportItem, setEditingTripReportItem] = useState<DetailedReportItem | null>(null);

  // Filter states for Trip Entry Logs
  const [tripDateFilter, setTripDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customTripDate, setCustomTripDate] = useState<string>(getTodayDateIST());
  const [tripSearch, setTripSearch] = useState<string>('');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('ALL');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      await FleetStore.syncWithSupabase();
      const [data, allSessions, tripsList] = await Promise.all([
        FleetStore.fetchAdminMetricsAsync(),
        FleetStore.fetchDutySessionsAsync(),
        FleetStore.fetchTripsAsync(),
      ]);
      setMetrics(data);
      setActiveSessions(allSessions.filter((s) => s.status === 'ACTIVE' || !s.end_time));

      setAllTrips(tripsList);
      const today = getTodayDateIST();
      const tripsToday = tripsList.filter((t) => t.trip_date === today);
      setTodayTrips(tripsToday);

      setDrivers(FleetStore.getDrivers());
      setVehicles(FleetStore.getVehicles());
      setCompanies(FleetStore.getCompanies());
      setLastSyncedTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Live instant refresh when driver starts or ends session
    const unsubscribeDuty = subscribeToDutyNotifications(() => {
      loadDashboardData();
    });

    // Auto-refresh every 15s so driver entries from mobile reflect automatically
    const interval = setInterval(loadDashboardData, 15000);
    const handleFocus = () => loadDashboardData();
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribeDuty();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const driverMap = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  // Compute filtered trips based on date tabs, driver filter, and search
  const filteredTrips = useMemo(() => {
    const today = getTodayDateIST();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgo = weekAgoDate.toISOString().split('T')[0];

    return allTrips.filter((t) => {
      // 1. Date Filter
      if (tripDateFilter === 'TODAY' && t.trip_date !== today) return false;
      if (tripDateFilter === 'YESTERDAY' && t.trip_date !== yesterday) return false;
      if (tripDateFilter === 'WEEK' && (t.trip_date < weekAgo || t.trip_date > today)) return false;
      if (tripDateFilter === 'CUSTOM' && customTripDate && t.trip_date !== customTripDate) return false;

      // 2. Driver Filter
      if (selectedDriverFilter !== 'ALL' && t.driver_id !== selectedDriverFilter) return false;

      // 3. Search Filter
      if (tripSearch.trim()) {
        const q = tripSearch.toLowerCase();
        const d = driverMap.get(t.driver_id);
        const c = companyMap.get(t.company_id);
        const v = t.vehicle_id ? vehicleMap.get(t.vehicle_id) : undefined;
        const match =
          (d?.full_name && d.full_name.toLowerCase().includes(q)) ||
          (d?.username && d.username.toLowerCase().includes(q)) ||
          (c?.name && c.name.toLowerCase().includes(q)) ||
          (v?.registration_number && v.registration_number.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [allTrips, tripDateFilter, customTripDate, selectedDriverFilter, tripSearch, driverMap, companyMap, vehicleMap]);

  const handleOpenEditTrip = (trip: Trip) => {
    const driver = driverMap.get(trip.driver_id);
    const company = companyMap.get(trip.company_id);
    const vehicle = trip.vehicle_id ? vehicleMap.get(trip.vehicle_id) : undefined;
    const rate = company?.billing_rate_per_km || 0;
    const earnings = parseFloat((trip.total_km * rate).toFixed(2));

    const isUber = Boolean(
      (trip.notes && trip.notes.includes('[UBER_EARNINGS:')) ||
      company?.name?.toLowerCase().includes('uber') ||
      trip.id.startsWith('uber-')
    );

    let uberAmount = 0;
    let cleanNotes = trip.notes;
    if (isUber && trip.notes && trip.notes.includes('[UBER_EARNINGS:')) {
      try {
        const match = trip.notes.match(/\[UBER_EARNINGS:(.*?)\]/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (parsed.amount) uberAmount = Number(parsed.amount);
          if (parsed.notes) cleanNotes = parsed.notes;
        }
      } catch {
        // fallback
      }
    }

    setEditingTripReportItem({
      id: trip.id,
      driver_id: trip.driver_id,
      company_id: trip.company_id,
      vehicle_id: trip.vehicle_id,
      trip_date: trip.trip_date,
      driver_name: driver?.full_name || 'Driver',
      driver_phone: driver?.phone,
      vehicle_reg: vehicle?.registration_number,
      company_name: isUber ? 'Uber Platform' : (company?.name || 'Company'),
      trip_type: trip.trip_type,
      one_side_km: trip.one_side_km,
      multiplier: trip.multiplier,
      total_km: isUber && uberAmount > 0 ? uberAmount : trip.total_km,
      billing_rate_per_km: rate,
      earnings: isUber && uberAmount > 0 ? uberAmount : earnings,
      fuel_amount: 0,
      created_at: trip.created_at,
      notes: trip.notes,
    });
    setIsEditTripOpen(true);
  };

  const handleDeleteTrip = async (trip: Trip) => {
    const driver = driverMap.get(trip.driver_id);
    const isUber = Boolean(
      (trip.notes && trip.notes.includes('[UBER_EARNINGS:')) ||
      companyMap.get(trip.company_id)?.name?.toLowerCase().includes('uber')
    );
    const label = isUber ? 'Uber Platform Entry' : 'Trip Entry';
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete this ${label} for ${driver?.full_name || 'Driver'} (${trip.total_km} KM)?\n\nThis will remove it directly from the database and recalculate fleet statistics.`
    );
    if (!confirmDelete) return;

    try {
      await Promise.all([
        FleetStore.deleteTripAsync(trip.id),
        FleetStore.deleteUberEarningAsync(trip.id),
        deleteTripAction(trip.id),
      ]);
      await loadDashboardData();
    } catch (err) {
      console.error('Error deleting trip from admin dashboard:', err);
      alert('Failed to delete trip from database');
    }
  };

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

      {/* 4. TRIP ENTRY LOG MANAGEMENT SECTION */}
      <Card
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-100/70 text-blue-700">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base sm:text-lg">
                    Trip Entry Log Management
                  </span>
                  <Badge variant="info" size="sm">
                    {filteredTrips.length} {filteredTrips.length === 1 ? 'Entry' : 'Entries'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">
                  Review, edit, reassign, or delete driver trip logs directly in the cloud database
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                disabled={isRefreshing}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />}
              >
                {isRefreshing ? 'Syncing...' : 'Sync Database'}
              </Button>
              <Link
                href="/admin/reports"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <span>Full Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* FILTER CONTROLS BAR */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            {/* Quick Date Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date:</span>
              </span>
              <button
                type="button"
                onClick={() => setTripDateFilter('TODAY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tripDateFilter === 'TODAY'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Today ({todayTrips.length})
              </button>

              <button
                type="button"
                onClick={() => setTripDateFilter('YESTERDAY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tripDateFilter === 'YESTERDAY'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Yesterday
              </button>

              <button
                type="button"
                onClick={() => setTripDateFilter('WEEK')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tripDateFilter === 'WEEK'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Last 7 Days
              </button>

              <button
                type="button"
                onClick={() => setTripDateFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tripDateFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Logs ({allTrips.length})
              </button>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setTripDateFilter('CUSTOM')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    tripDateFilter === 'CUSTOM'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pick Date
                </button>
                <input
                  type="date"
                  value={customTripDate}
                  onChange={(e) => {
                    setCustomTripDate(e.target.value);
                    setTripDateFilter('CUSTOM');
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Driver Dropdown & Search Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  placeholder="Search driver, company, vehicle, notes..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={selectedDriverFilter}
                  onChange={(e) => setSelectedDriverFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Drivers ({drivers.length})</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} {d.username ? `(@${d.username})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status info */}
              <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-slate-500 px-1">
                {lastSyncedTime && (
                  <span className="font-mono text-slate-400">
                    Synced: {lastSyncedTime}
                  </span>
                )}
                {(tripSearch || selectedDriverFilter !== 'ALL' || tripDateFilter !== 'TODAY') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTripDateFilter('TODAY');
                      setSelectedDriverFilter('ALL');
                      setTripSearch('');
                    }}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TRIP LOGS TABLE */}
          {filteredTrips.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Navigation className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700">No trip entry logs found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No entries matched the selected date or filter criteria. Switch to &quot;All Logs&quot; or check driver submissions.
              </p>
              {(tripSearch || selectedDriverFilter !== 'ALL' || tripDateFilter !== 'TODAY') && (
                <button
                  type="button"
                  onClick={() => {
                    setTripDateFilter('ALL');
                    setSelectedDriverFilter('ALL');
                    setTripSearch('');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  View All Logs ({allTrips.length})
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Client Company</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Journey Type</th>
                    <th className="py-3 px-4 text-right">Distance / Payout</th>
                    <th className="py-3 px-4">Route Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTrips.map((trip) => {
                    const driver = driverMap.get(trip.driver_id);
                    const company = companyMap.get(trip.company_id);
                    const vehicle = trip.vehicle_id ? vehicleMap.get(trip.vehicle_id) : undefined;

                    const isUber = Boolean(
                      (trip.notes && trip.notes.includes('[UBER_EARNINGS:')) ||
                      company?.name?.toLowerCase().includes('uber') ||
                      trip.id.startsWith('uber-')
                    );

                    let uberAmount = 0;
                    let uberRides: number | null = null;
                    let displayNotes = trip.notes || '-';

                    if (isUber && trip.notes && trip.notes.includes('[UBER_EARNINGS:')) {
                      try {
                        const match = trip.notes.match(/\[UBER_EARNINGS:(.*?)\]/);
                        if (match && match[1]) {
                          const parsed = JSON.parse(match[1]);
                          if (parsed.amount) uberAmount = Number(parsed.amount);
                          if (parsed.rides) uberRides = Number(parsed.rides);
                          displayNotes = parsed.notes || (uberRides ? `${uberRides} rides completed` : 'Uber Shift Payout');
                        }
                      } catch {
                        // fallback
                      }
                    }

                    return (
                      <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {trip.trip_date}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {formatTimeIST(trip.created_at)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                              {(driver?.full_name || 'D')[0].toUpperCase()}
                            </span>
                            <span>{driver?.full_name || 'Driver'}</span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono ml-6.5">
                            {driver?.username ? `@${driver.username}` : driver?.phone || ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isUber ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                              <Car className="w-3.5 h-3.5" />
                              <span>Uber Platform</span>
                            </span>
                          ) : (
                            <div>
                              <span className="font-medium text-slate-800">
                                {company?.name || 'Corporate Client'}
                              </span>
                              {company?.billing_rate_per_km ? (
                                <span className="text-[11px] text-slate-400 block font-mono">
                                  ₹{company.billing_rate_per_km}/KM
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {vehicle?.registration_number ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800">
                              {vehicle.registration_number}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isUber ? (
                            <Badge variant="success" size="sm">
                              PLATFORM SHIFT
                            </Badge>
                          ) : (
                            <Badge variant={trip.trip_type === 'ONE_SIDE' ? 'info' : 'purple'} size="sm">
                              {trip.trip_type === 'ONE_SIDE' ? '1-SIDE (x2)' : '2-SIDE (x1)'}
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {isUber ? (
                            <div>
                              <span className="text-emerald-700 font-black text-sm">
                                {formatCurrencyINR(uberAmount > 0 ? uberAmount : trip.total_km)}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-normal block">
                                Uber Earnings
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-900 font-black text-sm">
                                {trip.total_km} KM
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal block">
                                ({trip.one_side_km} × {trip.multiplier})
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                          {displayNotes}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTrip(trip)}
                              title="Edit Entry Log & Rechange Database"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTrip(trip)}
                              title="Delete from Database"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* ADMIN PROFILE MODAL */}
      <AdminProfileModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSaved={loadDashboardData}
      />

      {/* EDIT DRIVER TRIP ENTRY MODAL */}
      <EditTripModal
        isOpen={isEditTripOpen}
        onClose={() => setIsEditTripOpen(false)}
        item={editingTripReportItem}
        onSaved={loadDashboardData}
      />
    </div>
  );
}

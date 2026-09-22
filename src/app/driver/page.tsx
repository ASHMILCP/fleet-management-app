'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FleetStore } from '@/lib/store';
import { Profile, Trip, FuelLog, DriverTodaySummary } from '@/types';
import { getTodayDateIST, formatTimeIST, formatCurrencyINR } from '@/lib/timezone';
import { DutyToggle } from '@/components/driver/DutyToggle';
import { AddTripDialog } from '@/components/driver/AddTripDialog';
import { AddFuelDialog } from '@/components/driver/AddFuelDialog';
import { TodaySummaryCard } from '@/components/driver/TodaySummaryCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Navigation,
  Fuel,
  PlusCircle,
  Car,
  Clock,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function DriverDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isTripDialogOpen, setIsTripDialogOpen] = useState(false);
  const [isFuelDialogOpen, setIsFuelDialogOpen] = useState(false);
  const [todaySummary, setTodaySummary] = useState<DriverTodaySummary>({
    dutySession: null,
    startTime: null,
    endTime: null,
    workingHoursText: '0h 00m',
    workingHoursDecimal: 0,
    totalTrips: 0,
    totalKm: 0,
    fuelExpense: 0,
    fuelCostPerKm: 0,
  });
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [todayFuelLogs, setTodayFuelLogs] = useState<FuelLog[]>([]);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refreshData = useCallback(() => {
    const user = FleetStore.getCurrentUser();
    if (!user || !user.id) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);

    const summary = FleetStore.getDriverTodaySummary(user.id);
    setTodaySummary(summary);

    const today = getTodayDateIST();
    const allTrips = FleetStore.getTrips();
    const userTripsToday = allTrips.filter(
      (t) => t.driver_id === user.id && t.trip_date === today
    );
    setTodayTrips(userTripsToday);

    const allFuel = FleetStore.getFuelLogs();
    const userFuelToday = allFuel.filter(
      (f) => f.driver_id === user.id && f.log_date === today
    );
    setTodayFuelLogs(userFuelToday);
  }, [router]);

  useEffect(() => {
    refreshData();
  }, [refreshData, refreshIndex]);

  const handleStateChange = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  const companies = FleetStore.getCompanies();
  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      {/* 1. TOP WELCOME & VEHICLE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {currentUser?.full_name || 'Driver'}
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
              Active Driver
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Today: {getTodayDateIST()} (Asia/Kolkata)</span>
            {currentUser?.license_number && (
              <>
                <span className="text-slate-300">&bull;</span>
                <span>License: <strong className="font-mono text-slate-700">{currentUser.license_number}</strong></span>
              </>
            )}
          </p>
        </div>

        {/* QUICK ACTION SHORTCUTS */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsTripDialogOpen(true)}
            leftIcon={<Navigation className="w-4 h-4" />}
          >
            Add Trip
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsFuelDialogOpen(true)}
            leftIcon={<Fuel className="w-4 h-4 text-amber-600" />}
          >
            Add Fuel
          </Button>
        </div>
      </div>

      {/* 2. BIG START / END DUTY TOGGLE */}
      {currentUser && (
        <DutyToggle
          driverId={currentUser.id}
          onDutyChanged={handleStateChange}
        />
      )}

      {/* 3. TODAY'S SUMMARY CARD */}
      <TodaySummaryCard summary={todaySummary} />

      {/* 4. ACTION BUTTONS & TODAY'S ACTIVITY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACTION TILES */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold">Log New Trip</h3>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                Record your commute or corporate ride. Select client company, enter one-way KM, and confirm total distance.
              </p>
            </div>
            <button
              onClick={() => setIsTripDialogOpen(true)}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center justify-center gap-2 group"
            >
              <span>Launch Trip Logger</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-500/20 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold">Log Fuel Expense</h3>
              <p className="text-xs text-amber-100 mt-1 leading-relaxed">
                Log CNG or Petrol refuel receipts. Updates your real-time Fuel Cost / KM efficiency ratio instantly.
              </p>
            </div>
            <button
              onClick={() => setIsFuelDialogOpen(true)}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-white text-amber-700 font-bold text-sm hover:bg-amber-50 transition-colors shadow-sm flex items-center justify-center gap-2 group"
            >
              <span>Record Fuel Slip</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* RECENT TRIPS & FUEL BREAKDOWN FOR TODAY */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Trips */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>Today&apos;s Logged Trips ({todayTrips.length})</span>
              </div>
            }
            subtitle="Verified client trips under active shift"
          >
            {todayTrips.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Navigation className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="text-sm font-medium">No trips logged yet today.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click &ldquo;Add Trip&rdquo; above to record your completed distance.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {todayTrips.map((trip) => {
                  const companyName = companyMap.get(trip.company_id) || 'Corporate Client';
                  return (
                    <div
                      key={trip.id}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 mt-0.5">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {companyName}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Logged at {formatTimeIST(trip.created_at)}</span>
                            {trip.notes && (
                              <>
                                <span>&bull;</span>
                                <span className="italic text-slate-400">{trip.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <Badge
                          variant={trip.trip_type === 'ONE_SIDE' ? 'info' : 'purple'}
                          size="sm"
                        >
                          {trip.trip_type === 'ONE_SIDE' ? '1-SIDE (x2)' : '2-SIDE (x1)'}
                        </Badge>
                        <div>
                          <div className="text-base font-extrabold text-slate-900 font-mono">
                            {trip.total_km} KM
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ({trip.one_side_km} × {trip.multiplier})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Today's Fuel Logs */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-600" />
                <span>Today&apos;s Fuel Log ({todayFuelLogs.length})</span>
              </div>
            }
            subtitle="Fuel transactions used for cost/KM metric"
          >
            {todayFuelLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Fuel className="w-8 h-8 mx-auto mb-1 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-medium">No fuel logs recorded today.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayFuelLogs.map((fuel) => (
                  <div
                    key={fuel.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/50 rounded-xl px-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={fuel.fuel_type === 'CNG' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {fuel.fuel_type}
                      </Badge>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {fuel.notes || `${fuel.fuel_type} Refuel`}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatTimeIST(fuel.created_at)}
                          {fuel.liters_or_kg && ` &bull; ${fuel.liters_or_kg} ${fuel.fuel_type === 'CNG' ? 'Kg' : 'L'}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {formatCurrencyINR(fuel.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* DIALOGS */}
      {currentUser && (
        <>
          <AddTripDialog
            driverId={currentUser.id}
            isOpen={isTripDialogOpen}
            onClose={() => setIsTripDialogOpen(false)}
            onTripAdded={handleStateChange}
          />
          <AddFuelDialog
            driverId={currentUser.id}
            isOpen={isFuelDialogOpen}
            onClose={() => setIsFuelDialogOpen(false)}
            onFuelAdded={handleStateChange}
          />
        </>
      )}
    </div>
  );
}

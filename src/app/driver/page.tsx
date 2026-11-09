'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FleetStore } from '@/lib/store';
import { Profile, FuelLog, UberEarning, DriverTodaySummary } from '@/types';
import { getTodayDateIST, formatTimeIST, formatCurrencyINR } from '@/lib/timezone';
import { DutyToggle } from '@/components/driver/DutyToggle';
import { AddFuelDialog } from '@/components/driver/AddFuelDialog';
import { AddUberEarningsDialog } from '@/components/driver/AddUberEarningsDialog';
import { TodaySummaryCard } from '@/components/driver/TodaySummaryCard';
import { deleteTripAction } from '@/actions/trips';
import { deleteFuelLogAction } from '@/actions/fuel';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Fuel,
  PlusCircle,
  Car,
  Calendar,
  ArrowRight,
  Trash2,
  History,
} from 'lucide-react';

export default function DriverDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isFuelDialogOpen, setIsFuelDialogOpen] = useState(false);
  const [isUberDialogOpen, setIsUberDialogOpen] = useState(false);
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
    uberEarnings: 0,
    uberRent: 0,
    tripEarnings: 0,
    totalEarnings: 0,
    netEarnings: 0,
  });
  const [todayFuelLogs, setTodayFuelLogs] = useState<FuelLog[]>([]);
  const [todayUberLogs, setTodayUberLogs] = useState<UberEarning[]>([]);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refreshData = useCallback(async () => {
    await FleetStore.syncWithSupabase();
    const user = FleetStore.getCurrentUser();
    if (!user || !user.id) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);

    try {
      const [summary, allFuel, allUber] = await Promise.all([
        FleetStore.fetchDriverTodaySummaryAsync(user.id),
        FleetStore.fetchFuelLogsAsync(),
        FleetStore.fetchUberEarningsAsync(),
      ]);

      setTodaySummary(summary);

      const today = getTodayDateIST();
      const userFuelToday = allFuel.filter(
        (f) => f.driver_id === user.id && f.log_date === today
      );
      setTodayFuelLogs(userFuelToday);

      const userUberToday = allUber.filter(
        (u) => u.driver_id === user.id && u.earnings_date === today
      );
      setTodayUberLogs(userUberToday);
    } catch (err) {
      console.error('Error refreshing driver data:', err);
    }
  }, [router]);

  useEffect(() => {
    refreshData();
  }, [refreshData, refreshIndex]);

  const handleStateChange = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  const handleDeleteUber = async (uberId: string) => {
    if (!window.confirm('Are you sure you want to delete this Uber entry?')) return;
    try {
      const cleanId = uberId.startsWith('uber-') ? uberId.replace('uber-', '') : uberId;
      await Promise.all([
        FleetStore.deleteTripAsync(cleanId),
        FleetStore.deleteUberEarningAsync(cleanId),
        deleteTripAction(cleanId),
      ]);
      handleStateChange();
    } catch (err: any) {
      alert('Could not delete Uber entry: ' + (err.message || 'Error'));
    }
  };

  const handleDeleteFuel = async (fuelId: string) => {
    if (!window.confirm('Are you sure you want to delete this fuel record?')) return;
    try {
      await Promise.all([
        FleetStore.deleteFuelLogAsync(fuelId),
        deleteFuelLogAction(fuelId),
      ]);
      handleStateChange();
    } catch (err: any) {
      alert('Could not delete fuel entry: ' + (err.message || 'Error'));
    }
  };

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push('/driver/fuel-history')}
            className="border-slate-200 hover:bg-slate-50 text-slate-700"
            leftIcon={<History className="w-4 h-4 text-amber-600" />}
          >
            Fuel History
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsFuelDialogOpen(true)}
            leftIcon={<Fuel className="w-4 h-4 text-amber-600" />}
          >
            Add Fuel
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsUberDialogOpen(true)}
            className="bg-slate-900 hover:bg-black text-white border-slate-900 shadow-sm"
            leftIcon={<Car className="w-4 h-4 text-emerald-400" />}
          >
            Add Uber
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
          {/* Tile 1: Log Uber Earnings / Rent */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 text-white shadow-lg shadow-emerald-950/20 flex flex-col justify-between border border-slate-700/60">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Car className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Log Uber Shift</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30 uppercase">
                  Payout &amp; Rent
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Record daily completed Uber rides, platform payout, or vehicle rent to sync directly with fleet administration.
              </p>
            </div>
            <button
              onClick={() => setIsUberDialogOpen(true)}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-emerald-50 hover:text-emerald-900 transition-colors shadow-sm flex items-center justify-center gap-2 group"
            >
              <span>Add Uber Record</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Tile 2: Log Fuel */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-500/20 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold">Log Fuel Expense</h3>
              <p className="text-xs text-amber-100 mt-1 leading-relaxed">
                Log CNG or Petrol refuel receipts. Record quantity and amount to track shift expenses.
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

        {/* RECENT UBER ACTIVITY & FUEL BREAKDOWN FOR TODAY */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Uber Shift Records (Uber Earnings & Rent) */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-600" />
                <span>Today&apos;s Uber Shift Records ({todayUberLogs.length})</span>
              </div>
            }
            subtitle="Uber platform payouts & vehicle rent logged for today"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUberDialogOpen(true)}
                className="h-8 px-2.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
              >
                + Add Uber
              </Button>
            }
          >
            {todayUberLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Car className="w-8 h-8 mx-auto mb-1 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">No Uber records logged today</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click &ldquo;Add Uber&rdquo; above to record your shift payout or rent.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayUberLogs.map((uber) => {
                  const isRent = uber.category === 'UBER_RENT';
                  return (
                    <div
                      key={uber.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={isRent ? 'purple' : 'success'}
                          size="sm"
                        >
                          {isRent ? 'UBER RENT' : 'UBER EARNINGS'}
                        </Badge>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {uber.notes || (isRent ? 'Uber Vehicle Rent' : 'Uber Partner Payout')}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>{formatTimeIST(uber.created_at)}</span>
                            {uber.rides_count && (
                              <>
                                <span>&bull;</span>
                                <span>{uber.rides_count} rides</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <span className={`text-base font-extrabold font-mono ${isRent ? 'text-indigo-900' : 'text-emerald-700'}`}>
                            {isRent ? '' : '+'}{formatCurrencyINR(uber.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {isRent ? 'Rent Charge' : 'Shift Payout'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteUber(uber.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Uber entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            subtitle="CNG &amp; Petrol refuels recorded today"
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/driver/fuel-history')}
                  className="h-8 px-2.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                  leftIcon={<History className="w-3.5 h-3.5" />}
                >
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFuelDialogOpen(true)}
                  className="h-8 px-2.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                  leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                >
                  + Add Fuel
                </Button>
              </div>
            }
          >
            {todayFuelLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <Fuel className="w-8 h-8 mx-auto mb-1 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-medium">No fuel logs recorded today.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click &ldquo;Add Fuel&rdquo; to record CNG or Petrol receipts.
                </p>
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
                          {fuel.liters_or_kg ? ` • ${fuel.liters_or_kg} ${fuel.fuel_type === 'CNG' ? 'Kg' : 'L'}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {formatCurrencyINR(fuel.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteFuel(fuel.id)}
                        title="Delete Fuel Entry"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
          <AddFuelDialog
            driverId={currentUser.id}
            isOpen={isFuelDialogOpen}
            onClose={() => setIsFuelDialogOpen(false)}
            onFuelAdded={handleStateChange}
          />
          <AddUberEarningsDialog
            driverId={currentUser.id}
            isOpen={isUberDialogOpen}
            onClose={() => setIsUberDialogOpen(false)}
            onUberEarningAdded={handleStateChange}
          />
        </>
      )}
    </div>
  );
}

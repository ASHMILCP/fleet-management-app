'use client';

import React from 'react';
import { DriverTodaySummary } from '@/types';
import { formatTimeIST, formatCurrencyINR } from '@/lib/timezone';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Clock,
  Navigation,
  Fuel,
  Gauge,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface TodaySummaryCardProps {
  summary: DriverTodaySummary;
  refreshTrigger?: number;
}

export const TodaySummaryCard: React.FC<TodaySummaryCardProps> = ({ summary }) => {
  const {
    dutySession,
    startTime,
    endTime,
    workingHoursText,
    totalTrips,
    totalKm,
    fuelExpense,
    fuelCostPerKm,
    uberEarnings = 0,
    uberRent = 0,
    tripEarnings = 0,
    totalEarnings = 0,
    netEarnings = 0,
  } = summary;

  const isOnDuty = dutySession?.status === 'ACTIVE';

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <span className="text-base font-bold text-slate-900">Today&apos;s Duty &amp; Performance Summary</span>
        </div>
      }
      subtitle="Real-time shift metrics calculated in Asia/Kolkata timezone"
      action={
        dutySession ? (
          isOnDuty ? (
            <Badge variant="warning" size="sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              On Duty Shift
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Duty Completed
            </Badge>
          )
        ) : (
          <Badge variant="neutral" size="sm">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            No Shift Started
          </Badge>
        )
      }
      className="shadow-md"
    >
      <div className="space-y-4">
        {/* ROW 1: DUTY & EFFICIENCY METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. START / END TIME */}
          <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift Time</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-xs text-slate-500">
                Start: <strong className="text-slate-800 font-mono">{formatTimeIST(startTime)}</strong>
              </div>
              <div className="text-xs text-slate-500">
                End:{' '}
                {isOnDuty ? (
                  <span className="text-amber-600 font-semibold italic">Ongoing</span>
                ) : (
                  <strong className="text-slate-800 font-mono">{formatTimeIST(endTime)}</strong>
                )}
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-slate-400">Asia/Kolkata (IST)</div>
          </div>

          {/* 2. WORKING HOURS */}
          <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Working Hours</span>
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-blue-950 font-mono">
                {workingHoursText}
              </div>
              <div className="text-[11px] text-blue-600/80 font-medium">
                {summary.workingHoursDecimal} decimal hrs
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-blue-400">Calculated duration</div>
          </div>

          {/* 3. TOTAL TRIPS */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5 text-indigo-500" />
              <span>Total Trips</span>
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-indigo-950 font-mono">
                {totalTrips}
              </div>
              <div className="text-[11px] text-indigo-600/80 font-medium">
                Trips logged today
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-indigo-400">Corporate &amp; Commute</div>
          </div>

          {/* 4. TOTAL KM */}
          <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              <Gauge className="w-3.5 h-3.5 text-emerald-500" />
              <span>Total Distance</span>
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-950 font-mono">
                {totalKm.toFixed(1)}{' '}
                <span className="text-xs font-bold text-emerald-700">KM</span>
              </div>
              <div className="text-[11px] text-emerald-700/80 font-medium">
                Mileage recorded
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-emerald-400">With multiplier applied</div>
          </div>

          {/* 5. FUEL EXPENSE */}
          <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider">
              <Fuel className="w-3.5 h-3.5 text-amber-500" />
              <span>Fuel Expense</span>
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-amber-950 font-mono">
                {formatCurrencyINR(fuelExpense)}
              </div>
              <div className="text-[11px] text-amber-700/80 font-medium">
                CNG &amp; Petrol spent
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-amber-400">Today&apos;s fuel log</div>
          </div>

          {/* 6. FUEL COST / KM */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-100 border border-purple-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              <span>Fuel Cost / KM</span>
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-black text-purple-950 font-mono">
                ₹{fuelCostPerKm.toFixed(2)}
                <span className="text-xs font-bold text-purple-700">/KM</span>
              </div>
              <div className="text-[11px] text-purple-700/90 font-semibold truncate">
                {totalKm > 0 ? `(₹${fuelExpense} ÷ ${totalKm} km)` : 'Awaiting trip KM'}
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-purple-500 font-medium">
              Expense ratio
            </div>
          </div>
        </div>

        {/* ROW 2: SHIFT EARNINGS & REVENUE BREAKDOWN (UBER EARNINGS, UBER RENT, TOTAL) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Tile A: Uber Earnings */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Uber Earnings
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                  Payout
                </span>
              </div>
              <div className="mt-1.5">
                <div className="text-lg sm:text-xl font-black text-emerald-950 font-mono">
                  {formatCurrencyINR(uberEarnings)}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">Platform ride earnings</div>
              </div>
            </div>

            {/* Tile B: Uber Rent */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                  Uber Rent
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                  Rent
                </span>
              </div>
              <div className="mt-1.5">
                <div className="text-lg sm:text-xl font-black text-indigo-950 font-mono">
                  {formatCurrencyINR(uberRent)}
                </div>
                <div className="text-[10px] text-indigo-700 mt-0.5">Vehicle rental fee</div>
              </div>
            </div>

            {/* Tile C: Corporate Trips Earnings */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Corporate Client
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                  Trips
                </span>
              </div>
              <div className="mt-1.5">
                <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                  {formatCurrencyINR(tripEarnings)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Client billing revenue</div>
              </div>
            </div>

            {/* Tile D: Total Shift Revenue */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Total Shift Revenue
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold uppercase">
                  Today
                </span>
              </div>
              <div className="mt-1.5">
                <div className="text-lg sm:text-xl font-black text-white font-mono">
                  {formatCurrencyINR(totalEarnings)}
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Net after fuel: <strong className={`font-mono ${netEarnings < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrencyINR(netEarnings)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

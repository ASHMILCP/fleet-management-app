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
  Car,
  IndianRupee,
  Wallet,
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
      subtitle="Real-time shift metrics & earnings calculated in Asia/Kolkata timezone"
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
        {/* ROW 1: DUTY & OPERATIONAL METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. START / END TIME */}
          <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-2xl flex flex-col justify-between">
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
            <div className="mt-2 text-[10px] text-slate-400">Asia/Kolkata (IST)</div>
          </div>

          {/* 2. WORKING HOURS */}
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Working Hours</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-blue-950 font-mono">
                {workingHoursText}
              </div>
              <div className="text-[11px] text-blue-600/80 font-medium">
                {summary.workingHoursDecimal} decimal hrs
              </div>
            </div>
            <div className="mt-2 text-[10px] text-blue-400">Calculated duration</div>
          </div>

          {/* 3. TOTAL TRIPS */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5 text-indigo-500" />
              <span>Total Trips</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-indigo-950 font-mono">
                {totalTrips}
              </div>
              <div className="text-[11px] text-indigo-600/80 font-medium">
                Corporate trips today
              </div>
            </div>
            <div className="mt-2 text-[10px] text-indigo-400">Client rides logged</div>
          </div>

          {/* 4. TOTAL KM */}
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              <Gauge className="w-3.5 h-3.5 text-emerald-500" />
              <span>Total Distance</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-emerald-950 font-mono">
                {totalKm.toFixed(1)}{' '}
                <span className="text-xs font-bold text-emerald-700">KM</span>
              </div>
              <div className="text-[11px] text-emerald-700/80 font-medium">
                Mileage recorded
              </div>
            </div>
            <div className="mt-2 text-[10px] text-emerald-400">With multiplier applied</div>
          </div>
        </div>

        {/* ROW 2: FINANCIALS & EARNINGS BREAKDOWN */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* 1. UBER EARNINGS */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Uber Earnings</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                UBER
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrencyINR(uberEarnings)}
              </div>
              <div className="text-[11px] text-emerald-300 font-medium mt-0.5">
                {uberEarnings > 0 ? 'Platform revenue credited' : 'No Uber revenue yet'}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Direct partner earnings</div>
          </div>

          {/* 2. TOTAL GROSS EARNINGS */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-500 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-100 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                <span>Total Earnings</span>
              </div>
              <span className="text-[10px] bg-white/20 text-white font-bold px-1.5 py-0.5 rounded">
                GROSS
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono">
                {formatCurrencyINR(totalEarnings)}
              </div>
              <div className="text-[11px] text-emerald-100 font-medium mt-0.5">
                {tripEarnings > 0 && uberEarnings > 0
                  ? `Trips ₹${tripEarnings} + Uber ₹${uberEarnings}`
                  : uberEarnings > 0
                  ? `From Uber platform`
                  : tripEarnings > 0
                  ? `From corporate trips`
                  : 'Total day revenue'}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-emerald-200/80">Corporate + Uber Platform</div>
          </div>

          {/* 3. FUEL EXPENSE */}
          <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider">
              <Fuel className="w-3.5 h-3.5 text-amber-500" />
              <span>Fuel Expense</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-amber-950 font-mono">
                {formatCurrencyINR(fuelExpense)}
              </div>
              <div className="text-[11px] text-amber-700/80 font-medium">
                {fuelCostPerKm > 0 ? `₹${fuelCostPerKm.toFixed(2)}/KM efficiency` : 'Today&apos;s fuel spent'}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-amber-400">CNG &amp; Petrol logs</div>
          </div>

          {/* 4. NET PROFIT / IN-HAND */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-100 border border-indigo-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                <span>Net Earnings</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${netEarnings >= 0 ? 'bg-indigo-200 text-indigo-800' : 'bg-rose-100 text-rose-800'}`}>
                {netEarnings >= 0 ? 'PROFIT' : 'DEFICIT'}
              </span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-black font-mono ${netEarnings >= 0 ? 'text-indigo-950' : 'text-rose-600'}`}>
                {formatCurrencyINR(netEarnings)}
              </div>
              <div className="text-[11px] text-indigo-700/90 font-semibold mt-0.5">
                Earnings ({formatCurrencyINR(totalEarnings)}) - Fuel ({formatCurrencyINR(fuelExpense)})
              </div>
            </div>
            <div className="mt-2 text-[10px] text-indigo-500 font-medium">
              Net balance for today
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

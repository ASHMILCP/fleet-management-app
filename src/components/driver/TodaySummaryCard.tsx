'use client';

import React from 'react';
import { DriverTodaySummary } from '@/types';
import { formatTimeIST, formatCurrencyINR } from '@/lib/timezone';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Clock,
  Fuel,
  Gauge,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Car,
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
    navyWorkingHoursText,
    uberWorkingHoursText,
    totalKm,
    fuelExpense,
    uberEarnings = 0,
    uberRent = 0,
  } = summary;

  const isOnDuty = dutySession?.status === 'ACTIVE';
  const isNavyActive = isOnDuty && (dutySession?.duty_type || 'NAVY') === 'NAVY';
  const isUberActive = isOnDuty && dutySession?.duty_type === 'UBER';
  const uberNet = uberEarnings - uberRent;

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
        isOnDuty ? (
          isUberActive ? (
            <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Uber Duty Active
            </Badge>
          ) : (
            <Badge variant="info" size="sm" className="bg-blue-100 text-blue-800 border-blue-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Navy Duty Active
            </Badge>
          )
        ) : dutySession ? (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Duty Completed
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            Off Duty
          </Badge>
        )
      }
      className="shadow-md"
    >
      <div className="space-y-4">
        {/* ROW 1: DUTY & OPERATIONAL METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

          {/* 2. WORKING HOURS (NAVY & UBER BREAKDOWN) */}
          <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Working Hours</span>
            </div>
            <div className="mt-1.5">
              <div className="text-xl sm:text-2xl font-extrabold text-blue-950 font-mono">
                {workingHoursText}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                <div className="flex items-center justify-between text-blue-700">
                  <span>Navy Duty:</span>
                  <strong className="font-mono">{navyWorkingHoursText || '0h 00m'}</strong>
                </div>
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Uber Duty:</span>
                  <strong className="font-mono">{uberWorkingHoursText || '0h 00m'}</strong>
                </div>
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-blue-400">Calculated duration</div>
          </div>

          {/* 3. DAILY TOTAL KM RUN TODAY */}
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
                Daily total KM run
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-emerald-400">Mileage recorded today</div>
          </div>

          {/* 4. FUEL EXPENSE */}
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
            <div className="mt-1.5 text-[10px] text-amber-400">Today&apos;s refuel total</div>
          </div>
        </div>

        {/* ROW 2: SHIFT EARNINGS BREAKDOWN (UBER EARNINGS, UBER RENT, NET BALANCE) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tile A: Uber Earnings */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Uber Earnings
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold uppercase">
                  Payout
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                  {formatCurrencyINR(uberEarnings)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Platform ride earnings</div>
              </div>
            </div>

            {/* Tile B: Uber Rent */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                  Uber Rent
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-semibold uppercase">
                  Rent
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">
                  {formatCurrencyINR(uberRent)}
                </div>
                <div className="text-[11px] text-indigo-700 mt-0.5">Vehicle rental fee</div>
              </div>
            </div>

            {/* Tile C: Net Uber Balance */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  Net Uber Balance
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold uppercase">
                  Today
                </span>
              </div>
              <div className="mt-2">
                <div className={`text-xl sm:text-2xl font-black font-mono ${uberNet < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatCurrencyINR(uberNet)}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Uber Payout − Rent
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FleetStore } from '@/lib/store';
import {
  DetailedReportItem,
  DutySessionReportItem,
  LoginAuditItem,
  Profile,
  Company,
  ReportFilterCriteria,
} from '@/types';
import { getTodayDateIST, formatDateIST, formatDateTimeIST, formatCurrencyINR } from '@/lib/timezone';
import { exportToExcel, exportWorkingHoursToExcel, exportLoginDetailsToExcel } from '@/lib/export/excel';
import { exportToCSV, exportWorkingHoursToCSV, exportLoginDetailsToCSV } from '@/lib/export/csv';
import { exportToPDF, exportWorkingHoursToPDF, exportLoginDetailsToPDF } from '@/lib/export/pdf';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Users,
  Building2,
  TrendingUp,
  RotateCcw,
  FileText,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Car,
  LogIn,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Phone,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayMode, setDisplayMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Active Report Tab: 'trips' | 'hours' | 'logins'
  const [activeTab, setActiveTab] = useState<'trips' | 'hours' | 'logins'>('trips');

  // Filter state
  const today = getTodayDateIST();
  const defaultStartDate = `${today.slice(0, 7)}-01`;
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Password visibility map for driver credentials inspection
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Report datasets
  const [reportItems, setReportItems] = useState<DetailedReportItem[]>([]);
  const [workingHoursItems, setWorkingHoursItems] = useState<DutySessionReportItem[]>([]);
  const [loginAuditItems, setLoginAuditItems] = useState<LoginAuditItem[]>([]);

  // Selected driver object if specific driver is selected
  const activeSelectedDriver = useMemo(() => {
    if (selectedDriverId === 'ALL') return null;
    return drivers.find((d) => d.id === selectedDriverId) || null;
  }, [drivers, selectedDriverId]);

  const filterCriteria: ReportFilterCriteria = useMemo(
    () => ({
      startDate,
      endDate,
      driverId: selectedDriverId,
      companyId: selectedCompanyId,
    }),
    [startDate, endDate, selectedDriverId, selectedCompanyId]
  );

  const refreshReportData = async () => {
    setIsRefreshing(true);
    try {
      await FleetStore.syncWithSupabase();
      const currentDrivers = FleetStore.getDrivers();
      const currentCompanies = FleetStore.getCompanies();
      setDrivers(currentDrivers);
      setCompanies(currentCompanies);

      const [tripData, hoursData, loginsData] = await Promise.all([
        FleetStore.fetchDetailedReportsAsync(filterCriteria),
        FleetStore.fetchWorkingHoursReportsAsync(filterCriteria),
        FleetStore.fetchLoginAuditsAsync(filterCriteria),
      ]);

      setReportItems(tripData);
      setWorkingHoursItems(hoursData);
      setLoginAuditItems(loginsData);
    } catch (err) {
      console.error('Error refreshing report data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshReportData();

    // Auto refresh every 20 seconds
    const interval = setInterval(refreshReportData, 20000);
    const handleFocus = () => refreshReportData();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [filterCriteria]);

  // Aggregate metrics - Trips
  const totalKm = useMemo(
    () => reportItems.reduce((sum, item) => sum + item.total_km, 0),
    [reportItems]
  );
  const totalEarnings = useMemo(
    () => reportItems.reduce((sum, item) => sum + (item.earnings || 0), 0),
    [reportItems]
  );
  const uberEarningsTotal = useMemo(
    () => reportItems.filter((i) => i.company_name === 'Uber Platform').reduce((sum, item) => sum + (item.earnings || 0), 0),
    [reportItems]
  );
  const totalFuel = useMemo(
    () => reportItems.reduce((sum, item) => sum + (item.fuel_amount || 0), 0),
    [reportItems]
  );
  const avgCostPerKm = totalKm > 0 ? parseFloat((totalFuel / totalKm).toFixed(2)) : 0;
  const netProfit = totalEarnings - totalFuel;

  // Aggregate metrics - Working Hours
  const totalWorkingMinutes = useMemo(
    () => workingHoursItems.reduce((sum, item) => sum + item.total_minutes, 0),
    [workingHoursItems]
  );
  const totalHoursWorkedText = useMemo(() => {
    const hours = Math.floor(totalWorkingMinutes / 60);
    const mins = totalWorkingMinutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }, [totalWorkingMinutes]);

  const activeDutyCount = useMemo(
    () => workingHoursItems.filter((i) => i.status === 'ACTIVE').length,
    [workingHoursItems]
  );

  const avgShiftMinutes = useMemo(() => {
    if (workingHoursItems.length === 0) return 0;
    return Math.round(totalWorkingMinutes / workingHoursItems.length);
  }, [totalWorkingMinutes, workingHoursItems.length]);

  const avgShiftText = useMemo(() => {
    const hours = Math.floor(avgShiftMinutes / 60);
    const mins = avgShiftMinutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }, [avgShiftMinutes]);

  // Quick Preset Handlers
  const handleSetToday = () => {
    setStartDate(today);
    setEndDate(today);
  };

  const handleSetLast7Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(today);
  };

  const handleResetFilters = () => {
    setStartDate(defaultStartDate);
    setEndDate(today);
    setSelectedDriverId('ALL');
    setSelectedCompanyId('ALL');
  };

  const togglePasswordVisibility = (driverId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [driverId]: !prev[driverId],
    }));
  };

  const driverFilePrefix = activeSelectedDriver
    ? `${activeSelectedDriver.username || activeSelectedDriver.full_name.toLowerCase().replace(/\s+/g, '-')}-`
    : '';

  // Context-Aware Export handlers
  const handleExportExcel = () => {
    if (activeTab === 'hours') {
      exportWorkingHoursToExcel(
        workingHoursItems,
        `working-hours-${driverFilePrefix}${startDate}-to-${endDate}.xlsx`
      );
    } else if (activeTab === 'logins') {
      exportLoginDetailsToExcel(
        loginAuditItems,
        `login-details-${driverFilePrefix}${startDate}-to-${endDate}.xlsx`
      );
    } else {
      exportToExcel(
        reportItems,
        `fleet-report-${driverFilePrefix}${startDate}-to-${endDate}.xlsx`
      );
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'hours') {
      exportWorkingHoursToCSV(
        workingHoursItems,
        `working-hours-${driverFilePrefix}${startDate}-to-${endDate}.csv`
      );
    } else if (activeTab === 'logins') {
      exportLoginDetailsToCSV(
        loginAuditItems,
        `login-details-${driverFilePrefix}${startDate}-to-${endDate}.csv`
      );
    } else {
      exportToCSV(
        reportItems,
        `fleet-report-${driverFilePrefix}${startDate}-to-${endDate}.csv`
      );
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'hours') {
      exportWorkingHoursToPDF(
        workingHoursItems,
        filterCriteria,
        `working-hours-${driverFilePrefix}${startDate}-to-${endDate}.pdf`
      );
    } else if (activeTab === 'logins') {
      exportLoginDetailsToPDF(
        loginAuditItems,
        filterCriteria,
        `login-details-${driverFilePrefix}${startDate}-to-${endDate}.pdf`
      );
    } else {
      exportToPDF(
        reportItems,
        filterCriteria,
        `fleet-report-${driverFilePrefix}${startDate}-to-${endDate}.pdf`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & EXPORT ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-purple-600" />
              <span>Fleet &amp; Driver Operations Reports</span>
            </h1>
            {activeSelectedDriver && (
              <Badge variant="purple" size="md">
                👤 {activeSelectedDriver.full_name} Filtered
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Audit trip ledgers, driver working hours &amp; duty sessions, and user login details with export support.
          </p>
        </div>

        {/* EXPORTS & SYNC */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshReportData}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            {isRefreshing ? 'Syncing...' : 'Sync'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4 text-slate-600" />}
          >
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            className="bg-purple-600 hover:bg-purple-700"
            leftIcon={<FileText className="w-4 h-4 text-white" />}
          >
            PDF
          </Button>
        </div>
      </div>

      {/* 2. REPORT MODE TABS (TRIPS / WORKING HOURS / LOGIN DETAILS) */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'trips'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Trip &amp; Financial Ledger</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'trips' ? 'bg-purple-800 text-purple-200' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {reportItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hours')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'hours'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Driver Working Hours</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'hours' ? 'bg-blue-800 text-blue-200' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {workingHoursItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logins')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'logins'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Login Details &amp; Audit</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'logins' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {loginAuditItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. DEDICATED DRIVER SPOTLIGHT CARD (When a driver is filtered) */}
      {activeSelectedDriver && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-xl font-bold text-blue-300">
                {activeSelectedDriver.full_name?.charAt(0).toUpperCase() || 'D'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight">{activeSelectedDriver.full_name}</h2>
                  <Badge variant="purple" size="sm">
                    {activeSelectedDriver.role || 'DRIVER'}
                  </Badge>
                  {workingHoursItems.some((s) => s.status === 'ACTIVE') ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      On Duty Now
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-700 text-slate-300">
                      Off Duty
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/80 mt-1">
                  <span className="font-mono">@{activeSelectedDriver.username || 'driver'}</span>
                  {activeSelectedDriver.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-blue-400" />
                      {activeSelectedDriver.phone}
                    </span>
                  )}
                  {activeSelectedDriver.license_number && (
                    <span>License: {activeSelectedDriver.license_number}</span>
                  )}
                </div>
              </div>
            </div>

            {/* CREDENTIALS QUICK INSPECT */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Login Password</span>
                <div className="flex items-center gap-2 font-mono font-bold text-slate-200 mt-0.5">
                  <span>
                    {visiblePasswords[activeSelectedDriver.id]
                      ? activeSelectedDriver.password || '(None set)'
                      : activeSelectedDriver.password
                      ? '••••••••'
                      : '(None set)'}
                  </span>
                  {activeSelectedDriver.password && (
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(activeSelectedDriver.id)}
                      className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                      title={visiblePasswords[activeSelectedDriver.id] ? 'Hide' : 'Reveal'}
                    >
                      {visiblePasswords[activeSelectedDriver.id] ? (
                        <EyeOff className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="h-6 w-px bg-slate-700"></div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Shift Hours</span>
                <span className="font-mono font-bold text-blue-300 text-sm">{totalHoursWorkedText}</span>
              </div>

              <div className="h-6 w-px bg-slate-700"></div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Trips (Range)</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">
                  {reportItems.length} ({totalKm.toFixed(1)} km)
                </span>
              </div>

              <button
                onClick={() => setSelectedDriverId('ALL')}
                className="ml-auto px-2.5 py-1 text-[11px] rounded-lg bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
              >
                Clear Focus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FILTER CONTROLS BAR */}
      <Card
        title={
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Criteria</span>
          </div>
        }
        action={
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Driver Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Driver
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Drivers ({drivers.length})</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} {d.username ? `(@${d.username})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter (Active primarily on Trips tab) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Client Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Companies &amp; Platforms</option>
              <option value="UBER">🚕 Uber Platform Earnings</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Quick date ranges:</span>
          <button
            onClick={handleSetToday}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleSetLast7Days}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Last 7 Days
          </button>
        </div>
      </Card>

      {/* 5. DYNAMIC METRICS STRIP BASED ON ACTIVE TAB */}
      {activeTab === 'trips' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">Filtered Trips</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {reportItems.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Matching criteria</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] sm:text-xs font-bold text-blue-600 uppercase">Total Distance</div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono mt-1 truncate">
              {totalKm.toFixed(1)} <span className="text-xs sm:text-sm font-semibold">KM</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Sum of total_km</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/30">
            <div className="text-[11px] sm:text-xs font-bold text-emerald-700 uppercase flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Gross Earnings</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-1 truncate">
              {formatCurrencyINR(totalEarnings)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 sm:mt-1 truncate">
              {uberEarningsTotal > 0
                ? `Trips + Uber (${formatCurrencyINR(uberEarningsTotal)})`
                : 'Trips & Platform revenue'}
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200 shadow-xs">
            <div className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase">Fuel Logged</div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono mt-1 truncate">
              {formatCurrencyINR(totalFuel)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Fuel expenditure</div>
          </div>

          <div
            className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs col-span-2 sm:col-span-1 ${
              netProfit >= 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-rose-200 bg-rose-50/30'
            }`}
          >
            <div
              className={`text-[11px] sm:text-xs font-bold uppercase ${
                netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'
              }`}
            >
              Net Margin
            </div>
            <div
              className={`text-xl sm:text-2xl font-black font-mono mt-1 truncate ${
                netProfit >= 0 ? 'text-indigo-950' : 'text-rose-950'
              }`}
            >
              {formatCurrencyINR(netProfit)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Earnings - Fuel</div>
          </div>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/20">
            <div className="text-[11px] sm:text-xs font-bold text-blue-700 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Total Hours Worked</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono mt-1 truncate">
              {totalHoursWorkedText}
            </div>
            <div className="text-[10px] sm:text-[11px] text-blue-600/80 mt-0.5 sm:mt-1 truncate">
              {totalWorkingMinutes} logged minutes
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">Total Shifts / Sessions</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {workingHoursItems.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Duty records in period</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">Avg Shift Length</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {avgShiftText}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Average session duration</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
            <div className="text-[11px] sm:text-xs font-bold text-emerald-700 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Currently On Duty</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-1">
              {activeDutyCount} <span className="text-xs sm:text-sm font-semibold text-emerald-700">active</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 sm:mt-1 truncate">Live active shifts</div>
          </div>
        </div>
      )}

      {activeTab === 'logins' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-indigo-200 shadow-xs bg-indigo-50/20">
            <div className="text-[11px] sm:text-xs font-bold text-indigo-700 uppercase flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 text-indigo-600" />
              <span>Login Events Logged</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono mt-1">
              {loginAuditItems.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-indigo-600/80 mt-0.5 sm:mt-1 truncate">Audit trail entries</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">Active Accounts</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {drivers.filter((d) => d.is_active).length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Registered drivers</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20 col-span-2 md:col-span-1">
            <div className="text-[11px] sm:text-xs font-bold text-emerald-700 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auth Security Status</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-1">
              Protected
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 sm:mt-1 truncate">Credentials &amp; sessions sync</div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: 1. TRIPS & FINANCIALS LEDGER */}
      {activeTab === 'trips' && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-purple-600" />
              <span className="font-bold text-slate-800 text-sm sm:text-base">Trip &amp; Expense Ledger</span>
              <span className="text-xs text-slate-400 font-normal">({reportItems.length})</span>
            </div>
          }
          action={
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setDisplayMode('auto')}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  displayMode === 'auto'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setDisplayMode('cards')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  displayMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setDisplayMode('table')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  displayMode === 'table'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Table</span>
              </button>
            </div>
          }
        >
          {reportItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-base font-semibold text-slate-600">No trip records match the current filters</p>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting the date range, or selecting &ldquo;All Drivers&rdquo; or &ldquo;All Companies&rdquo;.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div
                className={`${
                  displayMode === 'auto' ? 'hidden lg:block' : displayMode === 'cards' ? 'hidden' : 'block'
                } overflow-x-auto`}
              >
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Trip Date</th>
                      <th className="py-3.5 px-4">Driver</th>
                      <th className="py-3.5 px-4">Vehicle Plate</th>
                      <th className="py-3.5 px-4">Client Company</th>
                      <th className="py-3.5 px-4">Trip Type</th>
                      <th className="py-3.5 px-4 text-right">1-Way KM</th>
                      <th className="py-3.5 px-4 text-center">Multi</th>
                      <th className="py-3.5 px-4 text-right">Total KM</th>
                      <th className="py-3.5 px-4 text-right">Rate/KM</th>
                      <th className="py-3.5 px-4 text-right">Earnings</th>
                      <th className="py-3.5 px-4 text-right">Fuel (₹)</th>
                      <th className="py-3.5 px-4 text-right">Net Profit</th>
                      <th className="py-3.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                          {formatDateIST(item.trip_date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.driver_name}</div>
                          {item.driver_phone && (
                            <div className="text-xs text-slate-400 font-mono">{item.driver_phone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                          {item.vehicle_reg || <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          {item.company_name === 'Uber Platform' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black text-white text-xs font-bold">
                              <span>UBER</span>
                              <span className="font-normal text-[10px] text-emerald-400">Platform</span>
                            </span>
                          ) : (
                            item.company_name
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.company_name === 'Uber Platform' ? (
                            <Badge variant="success" size="sm">
                              PAYOUT
                            </Badge>
                          ) : (
                            <Badge variant={item.trip_type === 'TWO_SIDE' ? 'purple' : 'info'} size="sm">
                              {item.trip_type === 'TWO_SIDE' ? '2-SIDE' : '1-SIDE'}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {item.one_side_km} km
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                          x{item.multiplier}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                          {item.total_km} km
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {item.billing_rate_per_km > 0 ? `₹${item.billing_rate_per_km}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                          {item.earnings > 0 ? formatCurrencyINR(item.earnings) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-700">
                          {item.fuel_amount > 0 ? formatCurrencyINR(item.fuel_amount) : '-'}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold ${
                            (item.net_profit ?? (item.earnings - item.fuel_amount)) >= 0
                              ? 'text-emerald-800'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatCurrencyINR(item.net_profit ?? (item.earnings - item.fuel_amount))}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td className="py-3.5 px-4 uppercase text-xs">Total Summary</td>
                      <td colSpan={6} className="py-3.5 px-4 text-xs text-slate-500">
                        {reportItems.length} records &bull; Avg Fuel Cost: ₹{avgCostPerKm.toFixed(2)}/KM
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-sm font-black">
                        {totalKm.toFixed(1)} km
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400">-</td>
                      <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-emerald-700">
                        {formatCurrencyINR(totalEarnings)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-amber-700">
                        {formatCurrencyINR(totalFuel)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono text-sm font-black ${
                          netProfit >= 0 ? 'text-emerald-800' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrencyINR(netProfit)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div
                className={`${
                  displayMode === 'auto' ? 'block lg:hidden' : displayMode === 'table' ? 'hidden' : 'block'
                } space-y-3 divide-y divide-slate-100`}
              >
                {reportItems.map((item) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                          <span>{formatDateIST(item.trip_date)}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-blue-700 truncate">{item.driver_name}</span>
                        </div>
                        {item.driver_phone && (
                          <div className="text-[11px] text-slate-400 font-mono">{item.driver_phone}</div>
                        )}
                      </div>
                      {item.company_name === 'Uber Platform' ? (
                        <Badge variant="success" size="sm">
                          PAYOUT
                        </Badge>
                      ) : (
                        <Badge variant={item.trip_type === 'TWO_SIDE' ? 'purple' : 'info'} size="sm">
                          {item.trip_type === 'TWO_SIDE' ? '2-SIDE' : '1-SIDE'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.company_name === 'Uber Platform' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black text-white text-xs font-bold">
                            <span>UBER</span>
                            <span className="font-normal text-[10px] text-emerald-400">Platform</span>
                          </span>
                        ) : (
                          <>
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">{item.company_name}</span>
                          </>
                        )}
                      </div>
                      {item.vehicle_reg && (
                        <div className="font-mono text-slate-700 font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]">
                          {item.vehicle_reg}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
                        <span className="font-mono font-bold text-slate-800">{item.total_km} km</span>
                        <span className="text-[10px] text-slate-400 block">
                          ({item.one_side_km} × {item.multiplier})
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate / KM</span>
                        <span className="font-mono font-bold text-slate-700">
                          {item.billing_rate_per_km > 0 ? `₹${item.billing_rate_per_km}` : '-'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Fuel</span>
                        <span className="font-mono font-bold text-amber-700">
                          {item.fuel_amount > 0 ? formatCurrencyINR(item.fuel_amount) : '₹0'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/70 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Gross Earnings</span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          {item.earnings > 0 ? formatCurrencyINR(item.earnings) : '₹0'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Net Profit</span>
                        <span
                          className={`font-mono font-extrabold text-sm ${
                            (item.net_profit ?? (item.earnings - item.fuel_amount)) >= 0
                              ? 'text-indigo-800'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatCurrencyINR(item.net_profit ?? (item.earnings - item.fuel_amount))}
                        </span>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* 7. TAB CONTENT: 2. WORKING HOURS & DUTY SESSIONS */}
      {activeTab === 'hours' && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800 text-sm sm:text-base">
                {activeSelectedDriver
                  ? `${activeSelectedDriver.full_name}'s Working Hours & Shift Logs`
                  : 'Driver Working Hours & Shift Logs'}
              </span>
              <span className="text-xs text-slate-400 font-normal">({workingHoursItems.length})</span>
            </div>
          }
          action={
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setDisplayMode('auto')}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  displayMode === 'auto'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setDisplayMode('cards')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  displayMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setDisplayMode('table')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  displayMode === 'table'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Table</span>
              </button>
            </div>
          }
        >
          {workingHoursItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-base font-semibold text-slate-600">No shift hours recorded for current filter</p>
              <p className="text-xs text-slate-400 mt-1">
                Duty sessions are automatically logged whenever drivers click &ldquo;Start Duty&rdquo; and &ldquo;End Duty&rdquo;.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div
                className={`${
                  displayMode === 'auto' ? 'hidden lg:block' : displayMode === 'cards' ? 'hidden' : 'block'
                } overflow-x-auto`}
              >
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Shift Date</th>
                      <th className="py-3.5 px-4">Driver Name</th>
                      <th className="py-3.5 px-4">Vehicle Plate</th>
                      <th className="py-3.5 px-4">Shift Start (IST)</th>
                      <th className="py-3.5 px-4">Shift End (IST)</th>
                      <th className="py-3.5 px-4 text-center">Working Duration</th>
                      <th className="py-3.5 px-4 text-center">Trips Done</th>
                      <th className="py-3.5 px-4 text-right">Distance (KM)</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workingHoursItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {formatDateIST(item.session_date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.driver_name}</div>
                          {item.driver_username && (
                            <div className="text-xs text-slate-400 font-mono">@{item.driver_username}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                          {item.vehicle_reg ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              <Car className="w-3 h-3 text-slate-500" />
                              {item.vehicle_reg}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {formatDateTimeIST(item.start_time)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {item.end_time ? (
                            formatDateTimeIST(item.end_time)
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                              Active Shift
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-mono font-bold text-xs border border-blue-200/80">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {item.formatted_duration}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                          {item.trips_count}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                          {(item.total_km || 0).toFixed(1)} km
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                            {item.status === 'ACTIVE' ? 'On Duty' : 'Completed'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td className="py-3.5 px-4 uppercase text-xs">Total Shift Hours</td>
                      <td colSpan={4} className="py-3.5 px-4 text-xs text-slate-500">
                        {workingHoursItems.length} recorded shifts &bull; Average shift: {avgShiftText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-sm font-black text-blue-900">
                        {totalHoursWorkedText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-sm font-black">
                        {workingHoursItems.reduce((s, i) => s + i.trips_count, 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-slate-900">
                        {workingHoursItems.reduce((s, i) => s + (i.total_km || 0), 0).toFixed(1)} km
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div
                className={`${
                  displayMode === 'auto' ? 'block lg:hidden' : displayMode === 'table' ? 'hidden' : 'block'
                } space-y-3 divide-y divide-slate-100`}
              >
                {workingHoursItems.map((item) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{formatDateIST(item.session_date)}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-blue-700">{item.driver_name}</span>
                        </div>
                        {item.driver_username && (
                          <div className="text-[11px] text-slate-400 font-mono">@{item.driver_username}</div>
                        )}
                      </div>
                      <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                        {item.status === 'ACTIVE' ? 'Active Shift' : 'Completed'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-mono">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Start Time</span>
                        <span className="text-slate-800 font-semibold">{formatDateTimeIST(item.start_time)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">End Time</span>
                        <span className="text-slate-800 font-semibold">
                          {item.end_time ? formatDateTimeIST(item.end_time) : 'Active / On Duty'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-blue-700 block">Total Working Duration</span>
                        <span className="font-mono font-black text-blue-950 text-sm">
                          {item.formatted_duration}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Trips / KM</span>
                        <span className="font-mono font-bold text-slate-800">
                          {item.trips_count} trips &bull; {(item.total_km || 0).toFixed(1)} km
                        </span>
                      </div>
                    </div>

                    {item.vehicle_reg && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vehicle: <strong className="font-mono text-slate-800">{item.vehicle_reg}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* 8. TAB CONTENT: 3. LOGIN DETAILS & AUDIT */}
      {activeTab === 'logins' && (
        <div className="space-y-6">
          {/* DRIVER CREDENTIALS SUMMARY LIST */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-800 text-sm sm:text-base">
                  {activeSelectedDriver
                    ? `${activeSelectedDriver.full_name}'s Login Credentials & Account`
                    : 'Driver Logins & Access Credentials'}
                </span>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Driver Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Assigned Vehicle</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drivers
                    .filter((d) => (selectedDriverId === 'ALL' ? true : d.id === selectedDriverId))
                    .map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {d.full_name?.charAt(0).toUpperCase() || 'D'}
                          </div>
                          <span>{d.full_name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-700">
                          @{d.username || 'driver'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">
                              {visiblePasswords[d.id]
                                ? d.password || '(None set)'
                                : d.password
                                ? '••••••••'
                                : '(None set)'}
                            </span>
                            {d.password && (
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(d.id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                title={visiblePasswords[d.id] ? 'Hide Password' : 'Show Password'}
                              >
                                {visiblePasswords[d.id] ? (
                                  <EyeOff className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {d.phone || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">
                          {d.assigned_vehicle_id ? (
                            <span className="text-slate-700 font-semibold">Assigned</span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={d.is_active ? 'success' : 'neutral'} size="sm">
                            {d.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-500 font-mono">
                          {formatDateIST(d.created_at)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* CHRONOLOGICAL LOGIN ACTIVITY AUDIT */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm sm:text-base">
                  Chronological Login Activity &amp; Session Records
                </span>
                <span className="text-xs text-slate-400 font-normal">({loginAuditItems.length})</span>
              </div>
            }
          >
            {loginAuditItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <LogIn className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="text-base font-semibold text-slate-600">No login records found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Logins are tracked whenever drivers authenticate into the fleet portal.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Login Time (IST)</th>
                      <th className="py-3.5 px-4">User / Driver</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Device &amp; Platform</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loginAuditItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                          {formatDateTimeIST(item.login_time)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.full_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-blue-600">
                          @{item.username}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={item.role === 'ADMIN' ? 'purple' : 'info'} size="sm">
                            {item.role}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                            {item.device_info}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Success
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

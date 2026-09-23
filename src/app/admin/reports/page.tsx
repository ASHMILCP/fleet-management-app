'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FleetStore } from '@/lib/store';
import { DetailedReportItem, Profile, Company, ReportFilterCriteria } from '@/types';
import { getTodayDateIST, formatDateIST, formatCurrencyINR } from '@/lib/timezone';
import { exportToExcel } from '@/lib/export/excel';
import { exportToCSV } from '@/lib/export/csv';
import { exportToPDF } from '@/lib/export/pdf';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Users,
  Building2,
  Gauge,
  Fuel,
  TrendingUp,
  RotateCcw,
  FileText,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayMode, setDisplayMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filter state
  const today = getTodayDateIST();
  const defaultStartDate = `${today.slice(0, 7)}-01`;
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Report items
  const [reportItems, setReportItems] = useState<DetailedReportItem[]>([]);

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
      setDrivers(FleetStore.getDrivers());
      setCompanies(FleetStore.getCompanies());
      const data = await FleetStore.fetchDetailedReportsAsync(filterCriteria);
      setReportItems(data);
    } catch (err) {
      console.error('Error refreshing report data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshReportData();

    // Auto refresh every 15 seconds to reflect newly submitted driver entries
    const interval = setInterval(refreshReportData, 15000);
    const handleFocus = () => refreshReportData();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [filterCriteria]);

  // Aggregate metrics
  const totalKm = useMemo(
    () => reportItems.reduce((sum, item) => sum + item.total_km, 0),
    [reportItems]
  );
  const totalEarnings = useMemo(
    () => reportItems.reduce((sum, item) => sum + (item.earnings || 0), 0),
    [reportItems]
  );
  const totalFuel = useMemo(() => {
    return reportItems.reduce((sum, item) => sum + (item.fuel_amount || 0), 0);
  }, [reportItems]);

  const avgCostPerKm = totalKm > 0 ? parseFloat((totalFuel / totalKm).toFixed(2)) : 0;
  const netProfit = totalEarnings - totalFuel;

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

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(reportItems, `fleet-report-${startDate}-to-${endDate}.xlsx`);
  };

  const handleExportCSV = () => {
    exportToCSV(reportItems, `fleet-report-${startDate}-to-${endDate}.csv`);
  };

  const handleExportPDF = () => {
    exportToPDF(reportItems, filterCriteria, `fleet-report-${startDate}-to-${endDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & EXPORT ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-purple-600" />
            <span>Fleet Activity &amp; Expense Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Filter historical trips and fuel expenditures. Export to Excel, CSV, or PDF.
          </p>
        </div>

        {/* EXPORT & REFRESH BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshReportData}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4 text-slate-600" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            className="bg-purple-600 hover:bg-purple-700"
            leftIcon={<FileText className="w-4 h-4 text-white" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* 2. FILTER CONTROLS BAR */}
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
              <option value="ALL">All Drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">
              Client Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Companies</option>
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
          <span className="text-xs text-slate-400 font-medium">Quick ranges:</span>
          <button
            onClick={handleSetToday}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Today
          </button>
          <button
            onClick={handleSetLast7Days}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Last 7 Days
          </button>
        </div>
      </Card>

      {/* 3. AGGREGATED METRICS STRIP */}
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
          <div className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 sm:mt-1 truncate">KM &times; Company Rate</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase">Fuel Logged</div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono mt-1 truncate">
            {formatCurrencyINR(totalFuel)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Fuel expenditure</div>
        </div>

        <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs col-span-2 sm:col-span-1 ${
          netProfit >= 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-rose-200 bg-rose-50/30'
        }`}>
          <div className={`text-[11px] sm:text-xs font-bold uppercase ${netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
            Net Margin
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-1 truncate ${netProfit >= 0 ? 'text-indigo-950' : 'text-rose-950'}`}>
            {formatCurrencyINR(netProfit)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Earnings - Fuel</div>
        </div>
      </div>

      {/* 4. DETAILED REPORT LEDGER */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
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
            <p className="text-base font-semibold text-slate-600">No records match the current filters</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting the date range, or selecting &ldquo;All Drivers&rdquo; or &ldquo;All Companies&rdquo;.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className={`${displayMode === 'auto' ? 'hidden lg:block' : displayMode === 'cards' ? 'hidden' : 'block'} overflow-x-auto`}>
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
                        {item.company_name}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={item.trip_type === 'TWO_SIDE' ? 'purple' : 'info'}
                          size="sm"
                        >
                          {item.trip_type === 'TWO_SIDE' ? '2-SIDE' : '1-SIDE'}
                        </Badge>
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

                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                        (item.net_profit ?? (item.earnings - item.fuel_amount)) >= 0
                          ? 'text-emerald-800'
                          : 'text-rose-600'
                      }`}>
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
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-400">
                      -
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-emerald-700">
                      {formatCurrencyINR(totalEarnings)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-amber-700">
                      {formatCurrencyINR(totalFuel)}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono text-sm font-black ${
                      netProfit >= 0 ? 'text-emerald-800' : 'text-rose-600'
                    }`}>
                      {formatCurrencyINR(netProfit)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className={`${displayMode === 'auto' ? 'block lg:hidden' : displayMode === 'table' ? 'hidden' : 'block'} space-y-3 divide-y divide-slate-100`}>
              {reportItems.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                  {/* DATE & DRIVER & BADGE */}
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
                    <Badge
                      variant={item.trip_type === 'TWO_SIDE' ? 'purple' : 'info'}
                      size="sm"
                    >
                      {item.trip_type === 'TWO_SIDE' ? '2-SIDE' : '1-SIDE'}
                    </Badge>
                  </div>

                  {/* COMPANY & VEHICLE */}
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{item.company_name}</span>
                    </div>
                    {item.vehicle_reg && (
                      <div className="font-mono text-slate-700 font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]">
                        {item.vehicle_reg}
                      </div>
                    )}
                  </div>

                  {/* DISTANCE & RATE */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
                      <span className="font-mono font-bold text-slate-800">{item.total_km} km</span>
                      <span className="text-[10px] text-slate-400 block">({item.one_side_km} × {item.multiplier})</span>
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

                  {/* EARNINGS & NET PROFIT */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/70 border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Gross Earnings</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {item.earnings > 0 ? formatCurrencyINR(item.earnings) : '₹0'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Net Profit</span>
                      <span className={`font-mono font-extrabold text-sm ${
                        (item.net_profit ?? (item.earnings - item.fuel_amount)) >= 0 ? 'text-indigo-800' : 'text-rose-600'
                      }`}>
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

              {/* MOBILE AGGREGATE SUMMARY FOOTER */}
              <div className="pt-3 border-t-2 border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Filtered Records Total
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block">Total Distance</span>
                    <span className="font-mono font-black text-sm">{totalKm.toFixed(1)} km</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">Total Earnings</span>
                    <span className="font-mono font-black text-sm">{formatCurrencyINR(totalEarnings)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">Total Fuel</span>
                    <span className="font-mono font-black text-sm">{formatCurrencyINR(totalFuel)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">Net Profit</span>
                    <span className="font-mono font-black text-sm">{formatCurrencyINR(netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

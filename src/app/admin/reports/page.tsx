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
} from 'lucide-react';

export default function AdminReportsPage() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Filter state
  const today = getTodayDateIST();
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Report items
  const [reportItems, setReportItems] = useState<DetailedReportItem[]>([]);

  useEffect(() => {
    setDrivers(FleetStore.getDrivers());
    setCompanies(FleetStore.getCompanies());
  }, []);

  const filterCriteria: ReportFilterCriteria = useMemo(
    () => ({
      startDate,
      endDate,
      driverId: selectedDriverId,
      companyId: selectedCompanyId,
    }),
    [startDate, endDate, selectedDriverId, selectedCompanyId]
  );

  useEffect(() => {
    const data = FleetStore.getDetailedReports(filterCriteria);
    setReportItems(data);
  }, [filterCriteria]);

  // Aggregate metrics
  const totalKm = useMemo(
    () => reportItems.reduce((sum, item) => sum + item.total_km, 0),
    [reportItems]
  );
  const totalFuel = useMemo(
    () => reportItems.reduce((sum, item) => sum + item.fuel_amount, 0),
    [reportItems]
  );
  const avgCostPerKm = totalKm > 0 ? parseFloat((totalFuel / totalKm).toFixed(2)) : 0;

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
    setStartDate('2026-09-01');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-purple-600" />
            <span>Fleet Activity &amp; Expense Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Filter historical trips and fuel expenditures. Export to Excel, CSV, or PDF.
          </p>
        </div>

        {/* EXPORT BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
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
            Export Excel (.xlsx)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            className="bg-purple-600 hover:bg-purple-700"
            leftIcon={<FileText className="w-4 h-4 text-white" />}
          >
            Export PDF (.pdf)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Filtered Trips</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {reportItems.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Matching criteria</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-blue-600 uppercase">Total Distance</div>
          <div className="text-2xl font-black text-blue-950 font-mono mt-1">
            {totalKm.toFixed(1)} <span className="text-sm">KM</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sum of total_km</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-amber-600 uppercase">Total Fuel Logged</div>
          <div className="text-2xl font-black text-amber-950 font-mono mt-1">
            {formatCurrencyINR(totalFuel)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Fuel expenditure</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs bg-purple-50/40">
          <div className="text-xs font-bold text-purple-700 uppercase">Fleet Fuel Cost / KM</div>
          <div className="text-2xl font-black text-purple-950 font-mono mt-1">
            ₹{avgCostPerKm.toFixed(2)} <span className="text-sm">/KM</span>
          </div>
          <div className="text-[11px] text-purple-600 mt-1">Total Fuel ÷ Total KM</div>
        </div>
      </div>

      {/* 4. DETAILED REPORT TABLE */}
      <Card>
        {reportItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="text-base font-semibold text-slate-600">No records match the current filters</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting the date range, or selecting &ldquo;All Drivers&rdquo; or &ldquo;All Companies&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <th className="py-3.5 px-4 text-right">Fuel (₹)</th>
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

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-700">
                      {item.fuel_amount > 0 ? formatCurrencyINR(item.fuel_amount) : '-'}
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
                    {reportItems.length} trips &bull; Avg Cost: ₹{avgCostPerKm.toFixed(2)}/KM
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-base font-black">
                    {totalKm.toFixed(1)} km
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-base font-black text-amber-700">
                    {formatCurrencyINR(totalFuel)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

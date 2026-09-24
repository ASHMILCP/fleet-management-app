'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FleetStore } from '@/lib/store';
import { Trip, Profile, UberEarning } from '@/types';
import { formatDateIST, formatTimeIST, formatCurrencyINR } from '@/lib/timezone';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Navigation, Building2, Calendar, FileText, RefreshCw, Download, Car, Trash2, TrendingUp } from 'lucide-react';

export default function DriverHistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'trips' | 'uber'>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [uberEarnings, setUberEarnings] = useState<UberEarning[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await FleetStore.syncWithSupabase();
      const user = FleetStore.getCurrentUser();
      if (!user || !user.id) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      const [allTrips, allUber] = await Promise.all([
        FleetStore.fetchTripsAsync(),
        FleetStore.fetchUberEarningsAsync(),
      ]);

      setTrips(allTrips.filter((t) => t.driver_id === user.id));
      setUberEarnings(allUber.filter((u) => u.driver_id === user.id));
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const companies = FleetStore.getCompanies();
  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  const totalKm = trips.reduce((sum, t) => sum + Number(t.total_km || 0), 0);
  const totalUber = uberEarnings.reduce((sum, u) => sum + Number(u.amount || 0), 0);

  const handleDeleteUber = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Uber earnings record?')) return;
    try {
      await FleetStore.deleteUberEarningAsync(id);
      loadData();
    } catch (err) {
      console.error('Error deleting uber earning:', err);
    }
  };

  const handleExportCsv = () => {
    if (activeTab === 'trips') {
      if (trips.length === 0) {
        alert('No trips available to export');
        return;
      }
      const headers = ['Date', 'Time', 'Company', 'Trip Type', 'One-Side KM', 'Multiplier', 'Total KM', 'Notes'];
      const rows = trips.map((t) => [
        t.trip_date,
        formatTimeIST(t.created_at),
        `"${companyMap.get(t.company_id) || 'Corporate Client'}"`,
        t.trip_type,
        t.one_side_km,
        `x${t.multiplier}`,
        t.total_km,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `my-trips-${currentUser?.full_name || 'driver'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (uberEarnings.length === 0) {
        alert('No Uber earnings available to export');
        return;
      }
      const headers = ['Date', 'Time', 'Platform', 'Rides Completed', 'Earnings Amount (₹)', 'Notes'];
      const rows = uberEarnings.map((u) => [
        u.earnings_date,
        formatTimeIST(u.created_at),
        'Uber Platform',
        u.rides_count || '',
        u.amount.toFixed(2),
        `"${(u.notes || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `my-uber-earnings-${currentUser?.full_name || 'driver'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            My Activity &amp; Earnings History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete record of your completed trips, mileage, and Uber platform earnings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Sync
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={activeTab === 'trips' ? trips.length === 0 : uberEarnings.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5 text-blue-600" />}
          >
            Export {activeTab === 'trips' ? 'Trips CSV' : 'Uber CSV'}
          </Button>
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-right">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">Lifetime Uber</div>
            <div className="text-lg font-black text-emerald-950 font-mono">{formatCurrencyINR(totalUber)}</div>
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-right">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Lifetime Distance</div>
            <div className="text-lg font-black text-blue-950 font-mono">{totalKm.toFixed(1)} KM</div>
          </div>
          <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right">
            <div className="text-[10px] font-bold text-slate-600 uppercase">Total Trips</div>
            <div className="text-lg font-black text-slate-900 font-mono">{trips.length}</div>
          </div>
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('trips')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'trips'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Corporate Trips ({trips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('uber')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'uber'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Car className="w-4 h-4 text-emerald-400" />
          <span>Uber Earnings ({uberEarnings.length})</span>
          {totalUber > 0 && (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
              {formatCurrencyINR(totalUber)}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CORPORATE TRIPS */}
      {activeTab === 'trips' && (
        <Card>
          {trips.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-base font-semibold text-slate-600">No trips on record yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Your logged trips will appear here with timestamp and company breakdown.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Client Company</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">One-Side KM</th>
                    <th className="py-3 px-4 text-center">Multiplier</th>
                    <th className="py-3 px-4 text-right">Total KM</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trips.map((trip) => {
                    const companyName = companyMap.get(trip.company_id) || 'Corporate Client';
                    return (
                      <tr key={trip.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{formatDateIST(trip.trip_date)}</div>
                          <div className="text-xs text-slate-400">{formatTimeIST(trip.created_at)}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-slate-800">{companyName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={trip.trip_type === 'TWO_SIDE' ? 'purple' : 'info'}
                            size="sm"
                          >
                            {trip.trip_type === 'TWO_SIDE' ? '2-SIDE' : '1-SIDE'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                          {trip.one_side_km} km
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">
                          x{trip.multiplier}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {trip.total_km} km
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                          {trip.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: UBER EARNINGS */}
      {activeTab === 'uber' && (
        <Card>
          {uberEarnings.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Car className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-base font-semibold text-slate-600">No Uber earnings logged yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Use the &ldquo;Add Uber&rdquo; option on your dashboard to log daily Uber revenue slips.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4 text-center">Completed Rides</th>
                    <th className="py-3 px-4 text-right">Gross Earnings (₹)</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uberEarnings.map((uber) => (
                    <tr key={uber.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatDateIST(uber.earnings_date)}</div>
                        <div className="text-xs text-slate-400">{formatTimeIST(uber.created_at)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center text-[10px] font-black">
                            UBER
                          </span>
                          <span className="font-bold text-slate-900">Uber Platform</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                        {uber.rides_count ? (
                          <Badge variant="neutral" size="sm">
                            {uber.rides_count} rides
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-base">
                        +{formatCurrencyINR(uber.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {uber.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteUber(uber.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete this record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-xs uppercase text-slate-500">
                      Total Uber Platform Revenue
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base font-black text-emerald-700">
                      +{formatCurrencyINR(totalUber)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

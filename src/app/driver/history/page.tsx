'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FleetStore } from '@/lib/store';
import { Trip, Profile } from '@/types';
import { formatDateIST, formatTimeIST } from '@/lib/timezone';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Navigation, Building2, Calendar, FileText, RefreshCw, Download } from 'lucide-react';

export default function DriverHistoryPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTrips = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await FleetStore.syncWithSupabase();
      const user = FleetStore.getCurrentUser();
      if (!user || !user.id) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      const all = await FleetStore.fetchTripsAsync();
      setTrips(all.filter((t) => t.driver_id === user.id));
    } catch (err) {
      console.error('Error loading trips:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const companies = FleetStore.getCompanies();
  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  const totalKm = trips.reduce((sum, t) => sum + Number(t.total_km || 0), 0);

  const handleExportCsv = () => {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            My Trip History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete record of your completed trips and distance logged
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTrips}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Sync
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={trips.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5 text-blue-600" />}
          >
            Export CSV
          </Button>
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
    </div>
  );
}

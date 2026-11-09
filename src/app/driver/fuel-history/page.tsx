'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FleetStore } from '@/lib/store';
import { FuelLog, Profile, Vehicle } from '@/types';
import { formatDateIST, formatTimeIST, formatCurrencyINR } from '@/lib/timezone';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AddFuelDialog } from '@/components/driver/AddFuelDialog';
import { deleteFuelLogAction } from '@/actions/fuel';
import {
  Fuel,
  Calendar,
  RefreshCw,
  Download,
  Trash2,
  PlusCircle,
  Car,
  FileText,
  TrendingDown,
  Clock,
  Layers,
} from 'lucide-react';

export default function DriverFuelHistoryPage() {
  const router = useRouter();
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddFuelOpen, setIsAddFuelOpen] = useState(false);
  const [filterFuelType, setFilterFuelType] = useState<'ALL' | 'CNG' | 'PETROL'>('ALL');

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
      const allFuel = await FleetStore.fetchFuelLogsAsync();
      const allVehicles = FleetStore.getVehicles();
      const userFuel = allFuel.filter((f) => f.driver_id === user.id);
      setFuelLogs(userFuel);
      setVehicles(allVehicles);
    } catch (err) {
      console.error('Error loading driver fuel logs:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const vehicleMap = useMemo(() => {
    return new Map(vehicles.map((v) => [v.id, v]));
  }, [vehicles]);

  const filteredLogs = useMemo(() => {
    if (filterFuelType === 'ALL') return fuelLogs;
    return fuelLogs.filter((f) => f.fuel_type === filterFuelType);
  }, [fuelLogs, filterFuelType]);

  const totalSpent = useMemo(() => {
    return filteredLogs.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [filteredLogs]);

  const totalCngSpent = useMemo(() => {
    return fuelLogs.filter((f) => f.fuel_type === 'CNG').reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [fuelLogs]);

  const totalPetrolSpent = useMemo(() => {
    return fuelLogs.filter((f) => f.fuel_type === 'PETROL').reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [fuelLogs]);

  const handleDeleteFuel = async (fuelId: string) => {
    if (!window.confirm('Are you sure you want to delete this fuel record?')) return;
    try {
      await Promise.all([
        FleetStore.deleteFuelLogAsync(fuelId),
        deleteFuelLogAction(fuelId),
      ]);
      await loadData();
    } catch (err: any) {
      alert('Could not delete fuel entry: ' + (err.message || 'Error'));
    }
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      alert('No fuel records to export');
      return;
    }
    const headers = ['Date', 'Time', 'Fuel Type', 'Amount (INR)', 'Quantity', 'Vehicle', 'Notes'];
    const rows = filteredLogs.map((f) => {
      const v = f.vehicle_id ? vehicleMap.get(f.vehicle_id) : undefined;
      const qty = f.liters_or_kg ? `${f.liters_or_kg} ${f.fuel_type === 'CNG' ? 'Kg' : 'L'}` : '';
      return [
        f.log_date,
        f.created_at ? formatTimeIST(f.created_at) : '',
        f.fuel_type,
        f.amount,
        `"${qty}"`,
        `"${v ? v.registration_number : 'Assigned'}"`,
        `"${(f.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fuel-history-${currentUser?.full_name || 'driver'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Fuel Entry History
            </h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
              Refuel Slips
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete record of your CNG &amp; Petrol refills, bills, and station entries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            disabled={filteredLogs.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5 text-blue-600" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddFuelOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Add Fuel
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Spent */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
            <span>Total Fuel Spent</span>
            <Fuel className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-950 font-mono">
              {formatCurrencyINR(totalSpent)}
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              {filteredLogs.length} receipts on record
            </div>
          </div>
        </div>

        {/* Card 2: CNG Total */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <span>CNG Refills</span>
            <Badge variant="success" size="sm">CNG</Badge>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-950 font-mono">
              {formatCurrencyINR(totalCngSpent)}
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">
              Gas station receipts
            </div>
          </div>
        </div>

        {/* Card 3: Petrol Total */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 uppercase tracking-wider">
            <span>Petrol Refills</span>
            <Badge variant="info" size="sm">PETROL</Badge>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-950 font-mono">
              {formatCurrencyINR(totalPetrolSpent)}
            </div>
            <div className="text-xs text-blue-700 mt-0.5">
              Petrol station receipts
            </div>
          </div>
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-3 pr-2">
          Filter Fuel:
        </span>
        <button
          type="button"
          onClick={() => setFilterFuelType('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterFuelType === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Fuel ({fuelLogs.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterFuelType('CNG')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterFuelType === 'CNG'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-emerald-50'
          }`}
        >
          CNG Only
        </button>
        <button
          type="button"
          onClick={() => setFilterFuelType('PETROL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterFuelType === 'PETROL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-blue-50'
          }`}
        >
          Petrol Only
        </button>
      </div>

      {/* FUEL LOGS TABLE & CARDS */}
      <Card>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Fuel className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="text-base font-semibold text-slate-600">No fuel entries logged</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &ldquo;Add Fuel&rdquo; above to record your CNG or Petrol receipts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Fuel Type</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Station / Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const vehicle = log.vehicle_id ? vehicleMap.get(log.vehicle_id) : undefined;
                  const isCng = log.fuel_type === 'CNG';
                  const quantityText = log.liters_or_kg
                    ? `${log.liters_or_kg} ${isCng ? 'Kg' : 'Liters'}`
                    : '-';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatDateIST(log.log_date)}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {log.created_at ? formatTimeIST(log.created_at) : '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={isCng ? 'success' : 'info'} size="sm">
                          {log.fuel_type}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-700 text-base">
                        {formatCurrencyINR(log.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                        {quantityText}
                      </td>
                      <td className="py-3.5 px-4">
                        {vehicle ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                            <span>{vehicle.registration_number}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Fleet Vehicle</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {log.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteFuel(log.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete fuel entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ADD FUEL DIALOG */}
      {currentUser && (
        <AddFuelDialog
          isOpen={isAddFuelOpen}
          onClose={() => setIsAddFuelOpen(false)}
          driverId={currentUser.id}
          onFuelAdded={loadData}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { FleetStore } from '@/lib/store';
import { Profile, Vehicle } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DriverModal } from '@/components/admin/DriverModal';
import {
  Users,
  UserPlus,
  Car,
  Phone,
  Edit2,
  Power,
  Trash2,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Profile | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setDrivers(FleetStore.getDrivers());
    setVehicles(FleetStore.getVehicles());
    await FleetStore.syncWithSupabase();
    setDrivers(FleetStore.getDrivers());
    setVehicles(FleetStore.getVehicles());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: Profile) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    FleetStore.toggleDriverStatus(id);
    loadData();
  };

  const handleDeleteDriver = async (driver: Profile) => {
    if (confirm(`Are you sure you want to delete driver "${driver.full_name}"? This action cannot be undone.`)) {
      setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
      await FleetStore.deleteDriverAsync(driver.id);
      loadData();
    }
  };

  const handleClearDemoData = () => {
    if (
      confirm(
        '⚠️ Are you sure you want to CLEAR ALL DEMO DATA?\n\nThis will remove all demo drivers, vehicles, companies, duty sessions, trips, and fuel logs so you can start 100% fresh.\n\nYour admin login will remain intact.'
      )
    ) {
      FleetStore.clearAllDemoData();
      loadData();
      alert('All demo data has been cleared! Your fleet system is now empty and ready for fresh entries.');
    }
  };

  const togglePasswordVisibility = (driverId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [driverId]: !prev[driverId],
    }));
  };

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  const filteredDrivers = drivers.filter((d) => {
    if (!d) return false;
    const query = searchQuery.toLowerCase();
    const fullName = d.full_name || '';
    const username = d.username || '';
    const phone = d.phone || '';
    const license = d.license_number || '';
    return (
      fullName.toLowerCase().includes(query) ||
      username.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query) ||
      license.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Driver Management &amp; Credentials</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create driver logins, inspect/reset passwords, assign fleet vehicles, and manage driver accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearDemoData}
            leftIcon={<RotateCcw className="w-4 h-4 text-rose-600" />}
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            Clear Demo Data
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add New Driver
          </Button>
        </div>
      </div>

      {/* FILTER & STATS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, phone..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing {filteredDrivers.length} of {drivers.length} drivers</span>
        </div>
      </div>

      {/* DRIVERS LIST / TABLE */}
      <Card>
        {/* DESKTOP TABLE VIEW (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Driver Name</th>
                <th className="py-3.5 px-4">Username &amp; Password</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">License No</th>
                <th className="py-3.5 px-4">Assigned Vehicle</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map((driver) => {
                const assignedVehicle = driver.assigned_vehicle_id
                  ? vehicleMap.get(driver.assigned_vehicle_id)
                  : null;
                const displayName = driver.full_name || 'Unnamed Driver';
                const initial = displayName.charAt(0).toUpperCase() || 'D';

                return (
                  <tr key={driver.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm">
                          {initial}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{displayName}</div>
                          <div className="text-xs text-slate-400 font-normal">Role: {driver.role || 'DRIVER'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-700 font-mono text-xs font-semibold">
                      {driver.username ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60">
                            <KeyRound className="w-3 h-3 text-blue-500" />
                            <span>@{driver.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pl-0.5">
                            <span className="text-slate-400 font-normal">Pass:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {visiblePasswords[driver.id]
                                ? driver.password || '(None)'
                                : driver.password
                                ? '••••••••'
                                : '(None)'}
                            </span>
                            {driver.password && (
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(driver.id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                title={visiblePasswords[driver.id] ? 'Hide Password' : 'Show Password'}
                              >
                                {visiblePasswords[driver.id] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No username set</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-600 font-mono text-xs">
                      {driver.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {driver.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-700 font-mono text-xs font-medium">
                      {driver.license_number || <span className="text-slate-400">Not recorded</span>}
                    </td>

                    <td className="py-4 px-4">
                      {assignedVehicle ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono font-semibold">
                          <Car className="w-3.5 h-3.5 text-slate-500" />
                          {assignedVehicle.registration_number} ({assignedVehicle.fuel_type})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <Badge variant={driver.is_active ? 'success' : 'neutral'} size="sm">
                        {driver.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(driver)}
                          title="Edit Driver Credentials"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(driver.id)}
                          title={driver.is_active ? 'Deactivate Driver' : 'Activate Driver'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            driver.is_active
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteDriver(driver)}
                          title="Delete Driver Account"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredDrivers.map((driver) => {
            const assignedVehicle = driver.assigned_vehicle_id
              ? vehicleMap.get(driver.assigned_vehicle_id)
              : null;
            const displayName = driver.full_name || 'Unnamed Driver';
            const initial = displayName.charAt(0).toUpperCase() || 'D';

            return (
              <div key={driver.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                {/* TOP ROW: AVATAR, NAME, STATUS */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{displayName}</div>
                      <div className="text-[11px] text-slate-400">Role: {driver.role || 'DRIVER'}</div>
                    </div>
                  </div>
                  <Badge variant={driver.is_active ? 'success' : 'neutral'} size="sm">
                    {driver.is_active ? 'Active' : 'Deactivated'}
                  </Badge>
                </div>

                {/* CREDENTIALS BOX */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-blue-700 border border-blue-200 font-mono font-semibold">
                    <KeyRound className="w-3 h-3 text-blue-500" />
                    <span>{driver.username ? `@${driver.username}` : 'No username'}</span>
                  </div>
                  {driver.username && (
                    <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                      <span className="text-slate-400 text-[11px]">Pass:</span>
                      <span className="font-bold text-slate-800">
                        {visiblePasswords[driver.id]
                          ? driver.password || '(None)'
                          : driver.password
                          ? '••••••••'
                          : '(None)'}
                      </span>
                      {driver.password && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(driver.id)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title={visiblePasswords[driver.id] ? 'Hide Password' : 'Show Password'}
                        >
                          {visiblePasswords[driver.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* METADATA ROW: PHONE, VEHICLE, LICENSE */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                    {driver.phone ? (
                      <a href={`tel:${driver.phone}`} className="text-blue-600 font-mono font-semibold hover:underline flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{driver.phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Vehicle</span>
                    {assignedVehicle ? (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800 mt-0.5">
                        <Car className="w-3 h-3 text-slate-500" />
                        <span>{assignedVehicle.registration_number}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  {driver.license_number && (
                    <div className="col-span-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">License No</span>
                      <span className="font-mono text-slate-700 text-xs">{driver.license_number}</span>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(driver)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(driver.id)}
                    leftIcon={<Power className="w-3.5 h-3.5" />}
                    className={driver.is_active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
                  >
                    {driver.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <button
                    onClick={() => handleDeleteDriver(driver)}
                    title="Delete Driver Account"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 hover:border-rose-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDrivers.length === 0 && (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Drivers Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your driver directory is empty. Click &quot;Add New Driver&quot; above to create driver accounts with custom usernames &amp; passwords.
            </p>
            <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
              Add First Driver
            </Button>
          </div>
        )}
      </Card>

      <DriverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driver={editingDriver}
        onSave={loadData}
      />
    </div>
  );
}

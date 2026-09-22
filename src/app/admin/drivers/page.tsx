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
  CreditCard,
  Edit2,
  Power,
  ShieldCheck,
  Search,
} from 'lucide-react';

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Profile | null>(null);

  const loadData = () => {
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

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  const filteredDrivers = drivers.filter((d) => {
    const query = searchQuery.toLowerCase();
    return (
      d.full_name.toLowerCase().includes(query) ||
      (d.phone && d.phone.toLowerCase().includes(query)) ||
      (d.license_number && d.license_number.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Driver Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register, assign fleet vehicles, edit licenses, and toggle active status
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New Driver
        </Button>
      </div>

      {/* FILTER & STATS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver by name, phone, license..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing {filteredDrivers.length} of {drivers.length} drivers</span>
        </div>
      </div>

      {/* DRIVERS TABLE */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Driver Name</th>
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

                return (
                  <tr key={driver.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm">
                          {driver.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{driver.full_name}</div>
                          <div className="text-xs text-slate-400 font-normal">Role: {driver.role}</div>
                        </div>
                      </div>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(driver)}
                          title="Edit Driver"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(driver.id)}
                          title={driver.is_active ? 'Deactivate Driver' : 'Activate Driver'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            driver.is_active
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

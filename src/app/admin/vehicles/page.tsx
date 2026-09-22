'use client';

import React, { useState, useEffect } from 'react';
import { FleetStore } from '@/lib/store';
import { Vehicle } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VehicleModal } from '@/components/admin/VehicleModal';
import {
  Truck,
  Plus,
  Fuel,
  Edit2,
  Power,
  Search,
  CheckCircle2,
} from 'lucide-react';

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const loadData = () => {
    setVehicles(FleetStore.getVehicles());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    FleetStore.toggleVehicleStatus(id);
    loadData();
  };

  const filteredVehicles = vehicles.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      v.registration_number.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.fuel_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>Fleet Vehicle Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register cars, track registration numbers, set fuel types, and manage fleet readiness
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Vehicle
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
            placeholder="Search by plate number, make or model..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing {filteredVehicles.length} of {vehicles.length} fleet vehicles</span>
        </div>
      </div>

      {/* VEHICLES TABLE */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Registration Plate</th>
                <th className="py-3.5 px-4">Vehicle Model</th>
                <th className="py-3.5 px-4">Fuel Type</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900 font-mono text-sm">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900">
                      <Truck className="w-4 h-4 text-slate-500" />
                      <span>{vehicle.registration_number}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 font-semibold text-slate-800">
                    {vehicle.model}
                  </td>

                  <td className="py-4 px-4">
                    <Badge
                      variant={vehicle.fuel_type === 'CNG' ? 'success' : 'warning'}
                      size="sm"
                    >
                      <Fuel className="w-3 h-3" />
                      {vehicle.fuel_type}
                    </Badge>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <Badge variant={vehicle.is_active ? 'success' : 'neutral'} size="sm">
                      {vehicle.is_active ? 'In Service' : 'Deactivated'}
                    </Badge>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(vehicle)}
                        title="Edit Vehicle"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(vehicle.id)}
                        title={vehicle.is_active ? 'Deactivate Vehicle' : 'Activate Vehicle'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          vehicle.is_active
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vehicle={editingVehicle}
        onSave={loadData}
      />
    </div>
  );
}

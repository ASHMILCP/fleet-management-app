'use client';

import React, { useState, useEffect } from 'react';
import { Vehicle, FuelType } from '@/types';
import { FleetStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
  onSave: () => void;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onSave,
}) => {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('CNG');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        setRegistrationNumber(vehicle.registration_number);
        setModel(vehicle.model);
        setFuelType(vehicle.fuel_type);
        setIsActive(vehicle.is_active);
      } else {
        setRegistrationNumber('');
        setModel('');
        setFuelType('CNG');
        setIsActive(true);
      }
    }
  }, [isOpen, vehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim() || !model.trim()) {
      alert('Please enter registration number and vehicle model');
      return;
    }

    FleetStore.saveVehicle({
      id: vehicle?.id,
      registration_number: registrationNumber.toUpperCase().trim(),
      model: model.trim(),
      fuel_type: fuelType,
      is_active: isActive,
    });

    onSave();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
      subtitle="Configure vehicle specifications and fuel category"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Registration Plate Number *
          </label>
          <input
            type="text"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
            placeholder="e.g. DL-01-AB-1234"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Vehicle Make &amp; Model *
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Maruti Suzuki Dzire Tour S"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Primary Fuel Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFuelType('CNG')}
              className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center transition-all ${
                fuelType === 'CNG'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              CNG (Natural Gas)
            </button>
            <button
              type="button"
              onClick={() => setFuelType('PETROL')}
              className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center transition-all ${
                fuelType === 'PETROL'
                  ? 'bg-amber-50 text-amber-700 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              PETROL
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="vehicle-active-check"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <label htmlFor="vehicle-active-check" className="text-sm font-medium text-slate-700">
            Active in Fleet (Available for duty shifts)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {vehicle ? 'Update Vehicle' : 'Save Vehicle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

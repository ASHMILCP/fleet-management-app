'use client';

import React, { useState, useEffect } from 'react';
import { Profile, Vehicle } from '@/types';
import { FleetStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver?: Profile | null;
  onSave: () => void;
}

export const DriverModal: React.FC<DriverModalProps> = ({
  isOpen,
  onClose,
  driver,
  onSave,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (isOpen) {
      setVehicles(FleetStore.getActiveVehicles());
      if (driver) {
        setFullName(driver.full_name);
        setPhone(driver.phone || '');
        setLicenseNumber(driver.license_number || '');
        setAssignedVehicleId(driver.assigned_vehicle_id || '');
        setIsActive(driver.is_active);
      } else {
        setFullName('');
        setPhone('');
        setLicenseNumber('');
        setAssignedVehicleId('');
        setIsActive(true);
      }
    }
  }, [isOpen, driver]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Please enter the driver name');
      return;
    }

    FleetStore.saveDriver({
      id: driver?.id,
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      license_number: licenseNumber.trim() || undefined,
      assigned_vehicle_id: assignedVehicleId || undefined,
      is_active: isActive,
    });

    onSave();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={driver ? 'Edit Driver Details' : 'Add New Driver'}
      subtitle="Manage driver credentials and vehicle assignment"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Driving License No
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. DL-0420180012345"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Assigned Vehicle (Optional)
          </label>
          <select
            value={assignedVehicleId}
            onChange={(e) => setAssignedVehicleId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- No vehicle assigned --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} ({v.model} - {v.fuel_type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="driver-active-check"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <label htmlFor="driver-active-check" className="text-sm font-medium text-slate-700">
            Active Driver (Eligible to log shifts and trips)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {driver ? 'Update Driver' : 'Save Driver'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

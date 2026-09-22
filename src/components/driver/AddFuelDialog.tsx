'use client';

import React, { useState } from 'react';
import { FuelType } from '@/types';
import { FleetStore } from '@/lib/store';
import { getTodayDateIST } from '@/lib/timezone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Fuel, IndianRupee, Calendar, CheckCircle } from 'lucide-react';

interface AddFuelDialogProps {
  driverId: string;
  isOpen: boolean;
  onClose: () => void;
  onFuelAdded?: () => void;
}

export const AddFuelDialog: React.FC<AddFuelDialogProps> = ({
  driverId,
  isOpen,
  onClose,
  onFuelAdded,
}) => {
  const [fuelType, setFuelType] = useState<FuelType>('CNG');
  const [amount, setAmount] = useState<string>('');
  const [litersOrKg, setLitersOrKg] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateIST());
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount spent');
      return;
    }

    const activeDuty = FleetStore.getActiveDutySession(driverId);
    const driver = FleetStore.getCurrentUser();

    FleetStore.addFuelLog({
      driver_id: driverId,
      vehicle_id: activeDuty?.vehicle_id || driver?.assigned_vehicle_id,
      duty_session_id: activeDuty?.id || null,
      fuel_type: fuelType,
      amount: parsedAmount,
      liters_or_kg: litersOrKg ? parseFloat(litersOrKg) : null,
      log_date: date || getTodayDateIST(),
      notes: notes.trim() || undefined,
    });

    // Reset fields
    setAmount('');
    setLitersOrKg('');
    setNotes('');
    onClose();

    if (onFuelAdded) onFuelAdded();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Fuel Expense"
      subtitle="Record fuel purchase to track fuel cost per KM"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* FUEL TYPE TOGGLE BUTTONS */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Select Fuel Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFuelType('CNG')}
              className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                fuelType === 'CNG'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>CNG (Compressed Natural Gas)</span>
            </button>
            <button
              type="button"
              onClick={() => setFuelType('PETROL')}
              className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                fuelType === 'PETROL'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20 ring-2 ring-amber-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>PETROL</span>
            </button>
          </div>
        </div>

        {/* AMOUNT (₹) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Amount Spent (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400 flex items-center">
              ₹
            </span>
            <input
              type="number"
              step="1"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 750"
              className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-bold font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* DATE & QUANTITY ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Date (Asia/Kolkata)
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Quantity ({fuelType === 'CNG' ? 'Kg' : 'Liters'}) (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              value={litersOrKg}
              onChange={(e) => setLitersOrKg(e.target.value)}
              placeholder={fuelType === 'CNG' ? 'e.g. 8.5 kg' : 'e.g. 7.2 L'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Fuel Station / Station Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. IGL Station, Sector 18"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" leftIcon={<CheckCircle className="w-4 h-4" />}>
            Record Fuel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

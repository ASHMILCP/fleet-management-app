'use client';

import React, { useState, useEffect } from 'react';
import { Company, TripType } from '@/types';
import { FleetStore } from '@/lib/store';
import { getTodayDateIST } from '@/lib/timezone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Navigation, Plus, Calculator, CheckCircle, ArrowRight } from 'lucide-react';

interface AddTripDialogProps {
  driverId: string;
  isOpen: boolean;
  onClose: () => void;
  onTripAdded?: () => void;
}

export const AddTripDialog: React.FC<AddTripDialogProps> = ({
  driverId,
  isOpen,
  onClose,
  onTripAdded,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [oneSideKm, setOneSideKm] = useState<string>('');
  const [tripType, setTripType] = useState<TripType>('ONE_SIDE');
  const [notes, setNotes] = useState<string>('');

  // Confirmation modal step
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const initialActive = FleetStore.getActiveCompanies();
      setCompanies(initialActive);
      if (initialActive.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(initialActive[0].id);
      }
      FleetStore.syncWithSupabase().then(() => {
        const active = FleetStore.getActiveCompanies();
        setCompanies(active);
        if (active.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(active[0].id);
        }
      });
    }
  }, [isOpen, selectedCompanyId]);

  const multiplier = tripType === 'ONE_SIDE' ? 2 : 1;
  const parsedKm = parseFloat(oneSideKm) || 0;
  const calculatedTotalKm = parseFloat((parsedKm * multiplier).toFixed(2));

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedKm <= 0) {
      alert('Please enter a valid One-Side KM greater than 0');
      return;
    }
    if (!selectedCompanyId) {
      alert('Please select a company');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const activeDuty = FleetStore.getActiveDutySession(driverId);
      const driver = FleetStore.getCurrentUser();
      const vehicleId = activeDuty?.vehicle_id || driver?.assigned_vehicle_id || undefined;

      await FleetStore.addTripAsync({
        driver_id: driverId,
        company_id: selectedCompanyId,
        vehicle_id: vehicleId,
        duty_session_id: activeDuty?.id || null,
        one_side_km: parsedKm,
        trip_type: tripType,
        multiplier,
        total_km: calculatedTotalKm,
        trip_date: getTodayDateIST(),
        notes: notes.trim() || undefined,
      });

      // Reset fields
      setOneSideKm('');
      setNotes('');
      setTripType('ONE_SIDE');
      setIsConfirmOpen(false);
      onClose();

      if (onTripAdded) onTripAdded();
    } catch (err: any) {
      alert(`Could not save trip to cloud: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <>
      {/* STEP 1: ADD TRIP FORM DIALOG */}
      <Modal
        isOpen={isOpen && !isConfirmOpen}
        onClose={onClose}
        title="Add New Trip"
        subtitle="Log mileage and associate client company"
      >
        <form onSubmit={handleOpenConfirmation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Client Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              {companies.length === 0 ? (
                <option value="">No active companies found</option>
              ) : (
                companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              One-Side Distance (KM)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={oneSideKm}
                onChange={(e) => setOneSideKm(e.target.value)}
                placeholder="e.g. 24.5"
                className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                KM
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Trip Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTripType('ONE_SIDE')}
                className={`p-3 rounded-xl border text-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  tripType === 'ONE_SIDE'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>ONE SIDE</span>
                <span className="text-xs font-mono font-normal opacity-80">Multiplier: x2 (Double)</span>
              </button>
              <button
                type="button"
                onClick={() => setTripType('TWO_SIDE')}
                className={`p-3 rounded-xl border text-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  tripType === 'TWO_SIDE'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>TWO SIDE</span>
                <span className="text-xs font-mono font-normal opacity-80">Multiplier: x1</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Notes / Route Info (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning pick up for Shift A"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Quick Preview Box */}
          {parsedKm > 0 && (
            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">Calculated Distance:</span>
              <span className="font-mono font-bold text-slate-800">
                {parsedKm} KM × {multiplier} = {calculatedTotalKm} Total KM
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Review &amp; Confirm
            </Button>
          </div>
        </form>
      </Modal>

      {/* STEP 2: CONFIRMATION MODAL WITH MULTIPLIER FORMULA */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Trip Details"
        subtitle="Review calculations before saving into database"
      >
        <div className="space-y-5">
          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
              Trip Calculation Breakdown
            </div>

            <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Company:</span>
                <span className="font-bold text-slate-800">{selectedCompany?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">One-Side Distance:</span>
                <span className="font-mono font-semibold text-slate-800">{parsedKm} KM</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Trip Type:</span>
                <span className="font-semibold text-blue-700">
                  {tripType} (Multiplier ×{multiplier})
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-700">Formula:</span>
                <span className="font-mono text-xs text-slate-600">
                  {parsedKm} KM × {multiplier}
                </span>
              </div>

              <div className="p-3 bg-blue-600 text-white rounded-lg flex items-center justify-between">
                <span className="text-sm font-bold">TOTAL RECORDED KM:</span>
                <span className="text-2xl font-extrabold font-mono">{calculatedTotalKm} KM</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            This will record the trip for today ({getTodayDateIST()}) under your current shift.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Back / Edit
            </Button>
            <Button
              variant="success"
              onClick={handleFinalSubmit}
              isLoading={isSubmitting}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Confirm &amp; Save Trip
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

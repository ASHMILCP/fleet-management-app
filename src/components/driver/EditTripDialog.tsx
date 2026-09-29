'use client';

import React, { useState, useEffect } from 'react';
import { Trip, Company, TripType } from '@/types';
import { FleetStore } from '@/lib/store';
import { updateTripAction, deleteTripAction } from '@/actions/trips';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Navigation, Building2, Layers, Trash2, Save, AlertCircle } from 'lucide-react';

interface EditTripDialogProps {
  trip: Trip | null;
  driverId: string;
  isOpen: boolean;
  onClose: () => void;
  onTripUpdated?: () => void;
}

export const EditTripDialog: React.FC<EditTripDialogProps> = ({
  trip,
  driverId,
  isOpen,
  onClose,
  onTripUpdated,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [oneSideKm, setOneSideKm] = useState<string>('');
  const [tripType, setTripType] = useState<TripType>('ONE_SIDE');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load companies
  useEffect(() => {
    if (isOpen) {
      const active = FleetStore.getActiveCompanies();
      setCompanies(active.length > 0 ? active : FleetStore.getCompanies());
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Pre-fill fields whenever trip changes
  useEffect(() => {
    if (isOpen && trip) {
      setSelectedCompanyId(trip.company_id || '');
      setOneSideKm(trip.one_side_km ? String(trip.one_side_km) : '');
      setTripType(trip.trip_type || 'ONE_SIDE');
      setNotes(trip.notes || '');
      setErrorMessage(null);
    }
  }, [isOpen, trip]);

  const multiplier = tripType === 'ONE_SIDE' ? 2 : 1;
  const parsedKm = parseFloat(oneSideKm) || 0;
  const calculatedTotalKm = parseFloat((parsedKm * multiplier).toFixed(2));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    if (parsedKm <= 0) {
      setErrorMessage('Please enter a valid One-Side KM greater than 0');
      return;
    }

    if (!selectedCompanyId) {
      setErrorMessage('Please select a client company');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const cleanTripId = trip.id.startsWith('uber-') ? trip.id.replace('uber-', '') : trip.id;
      const effectiveDriverId = trip.driver_id || driverId;

      // 1. Update in local cache & Supabase browser client
      await FleetStore.updateTripAsync(cleanTripId, {
        driver_id: effectiveDriverId,
        company_id: selectedCompanyId,
        vehicle_id: trip.vehicle_id,
        one_side_km: parsedKm,
        trip_type: tripType,
        multiplier,
        total_km: calculatedTotalKm,
        trip_date: trip.trip_date,
        notes: notes.trim() || undefined,
      });

      // 2. Also trigger server action for server-side cache revalidation
      await updateTripAction({
        id: cleanTripId,
        driverId: effectiveDriverId,
        companyId: selectedCompanyId,
        vehicleId: trip.vehicle_id,
        oneSideKm: parsedKm,
        tripType,
        multiplier,
        totalKm: calculatedTotalKm,
        tripDate: trip.trip_date,
        notes: notes.trim() || undefined,
      });

      if (onTripUpdated) onTripUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error updating trip log:', err);
      setErrorMessage(err.message || 'Failed to update trip entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trip) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this trip (${calculatedTotalKm} KM)?\n\nThis will remove it from your log and recalculate today's total distance.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const cleanTripId = trip.id.startsWith('uber-') ? trip.id.replace('uber-', '') : trip.id;

      await Promise.all([
        FleetStore.deleteTripAsync(cleanTripId),
        deleteTripAction(cleanTripId),
      ]);

      if (onTripUpdated) onTripUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error deleting trip log:', err);
      setErrorMessage(err.message || 'Failed to delete trip. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!trip) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Trip Log"
      subtitle="Modify distance, client company, or trip type"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. CLIENT COMPANY */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Client Company</span>
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          >
            {companies.length === 0 ? (
              <option value="">No companies available</option>
            ) : (
              companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 2. ONE-SIDE DISTANCE */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-indigo-600" />
            <span>One-Side Distance (KM)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={oneSideKm}
              onChange={(e) => setOneSideKm(e.target.value)}
              placeholder="e.g. 24.5"
              className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
              KM
            </span>
          </div>
        </div>

        {/* 3. TRIP TYPE SELECTION */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Trip Type</span>
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
              <span className="text-xs font-mono font-normal opacity-80">
                Multiplier: x2 (Return)
              </span>
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
              <span className="text-xs font-mono font-normal opacity-80">
                Multiplier: x1
              </span>
            </button>
          </div>
        </div>

        {/* 4. NOTES / REMARKS */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Notes / Route Info (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Airport drop, Highway route"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* 5. CALCULATION PREVIEW */}
        {parsedKm > 0 && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-blue-900 font-semibold">Total Recorded Distance:</span>
            <span className="font-mono font-black text-blue-950 text-sm">
              {parsedKm} KM × {multiplier} = {calculatedTotalKm} KM
            </span>
          </div>
        )}

        {/* 6. ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 order-2 sm:order-1"
          >
            {isDeleting ? 'Deleting...' : 'Delete Entry'}
          </Button>

          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving || isDeleting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

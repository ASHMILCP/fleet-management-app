'use client';

import React, { useState, useEffect } from 'react';
import { DetailedReportItem, Profile, Company, Vehicle, TripType } from '@/types';
import { FleetStore } from '@/lib/store';
import { updateTripAction, deleteTripAction } from '@/actions/trips';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrencyINR } from '@/lib/timezone';
import {
  Navigation,
  User,
  Building2,
  Car,
  Calendar,
  Layers,
  Calculator,
  Trash2,
  CheckCircle,
  AlertCircle,
  Save,
  ArrowRight,
} from 'lucide-react';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DetailedReportItem | null;
  onSaved: () => void;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaved,
}) => {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Form states
  const [driverId, setDriverId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [tripDate, setTripDate] = useState<string>('');
  const [tripType, setTripType] = useState<TripType>('ONE_SIDE');
  const [oneSideKm, setOneSideKm] = useState<string>('');
  const [customTotalKm, setCustomTotalKm] = useState<string>('');
  const [isCustomTotal, setIsCustomTotal] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load lists
  useEffect(() => {
    if (isOpen) {
      setDrivers(FleetStore.getDrivers());
      setCompanies(FleetStore.getCompanies());
      setVehicles(FleetStore.getVehicles());
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Pre-fill form when item changes
  useEffect(() => {
    if (isOpen && item) {
      const allDrivers = FleetStore.getDrivers();
      const allCompanies = FleetStore.getCompanies();
      const allVehicles = FleetStore.getVehicles();

      // Find matched driver
      let matchedDriverId = item.driver_id || '';
      if (!matchedDriverId) {
        const found = allDrivers.find(
          (d) => d.full_name?.toLowerCase() === item.driver_name?.toLowerCase()
        );
        matchedDriverId = found?.id || '';
      }
      setDriverId(matchedDriverId);

      // Find matched company
      let matchedCompanyId = item.company_id || '';
      if (!matchedCompanyId) {
        const found = allCompanies.find(
          (c) => c.name?.toLowerCase() === item.company_name?.toLowerCase()
        );
        matchedCompanyId = found?.id || '';
      }
      setCompanyId(matchedCompanyId);

      // Find matched vehicle
      let matchedVehicleId = item.vehicle_id || '';
      if (!matchedVehicleId && item.vehicle_reg) {
        const found = allVehicles.find(
          (v) => v.registration_number?.toLowerCase() === item.vehicle_reg?.toLowerCase()
        );
        matchedVehicleId = found?.id || '';
      }
      setVehicleId(matchedVehicleId);

      setTripDate(item.trip_date || '');
      setTripType(item.trip_type || 'ONE_SIDE');
      setOneSideKm(item.one_side_km ? String(item.one_side_km) : '');
      setCustomTotalKm(item.total_km ? String(item.total_km) : '');
      const mult = (item.trip_type === 'ONE_SIDE' || !item.trip_type) ? 2 : 1;
      const expected = parseFloat(((item.one_side_km || 0) * mult).toFixed(2));
      const hasCustomOverride = Boolean(item.total_km && Math.abs(Number(item.total_km) - expected) > 0.05);
      setIsCustomTotal(hasCustomOverride);
      setNotes(item.notes || '');
    }
  }, [isOpen, item]);

  // Auto calculate multiplier and total
  const multiplier = tripType === 'ONE_SIDE' ? 2 : 1;
  const parsedKm = parseFloat(oneSideKm) || 0;
  const calculatedTotalKm = parseFloat((parsedKm * multiplier).toFixed(2));
  const effectiveTotalKm = isCustomTotal && customTotalKm !== '' ? parseFloat(customTotalKm) || 0 : calculatedTotalKm;

  // Selected company rate
  const selectedCompany = companies.find((c) => c.id === companyId);
  const billingRate = selectedCompany?.billing_rate_per_km || item?.billing_rate_per_km || 0;
  const estimatedEarnings = parseFloat((effectiveTotalKm * billingRate).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (!driverId) {
      setErrorMessage('Please select a driver for this entry');
      return;
    }

    if (parsedKm <= 0 && effectiveTotalKm <= 0) {
      setErrorMessage('Please enter a distance greater than 0 KM');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const cleanTripId = item.id.startsWith('uber-') ? item.id.replace('uber-', '') : item.id;

      // 1. Update in FleetStore (local + browser Supabase client)
      await FleetStore.updateTripAsync(cleanTripId, {
        driver_id: driverId,
        company_id: companyId || undefined,
        vehicle_id: vehicleId || undefined,
        one_side_km: parsedKm,
        trip_type: tripType,
        multiplier,
        total_km: effectiveTotalKm,
        trip_date: tripDate,
        notes: notes.trim() || undefined,
      });

      // 2. Also execute server action for server-side Supabase update & revalidation
      const res = await updateTripAction({
        id: cleanTripId,
        driverId,
        companyId: companyId || item.company_id || '',
        vehicleId: vehicleId || undefined,
        oneSideKm: parsedKm,
        tripType,
        multiplier,
        totalKm: effectiveTotalKm,
        tripDate,
        notes: notes.trim() || undefined,
      });

      if (res && !res.success) {
        console.warn('Server action update warning:', res.error);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error updating driver trip entry:', err);
      setErrorMessage(err.message || 'Failed to update entry in database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete this trip entry (${item.driver_name} - ${item.total_km} KM)?\n\nThis will remove it from the database and recalculate all fleet statistics.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const cleanTripId = item.id.startsWith('uber-') ? item.id.replace('uber-', '') : item.id;

      await Promise.all([
        FleetStore.deleteTripAsync(cleanTripId),
        deleteTripAction(cleanTripId),
      ]);

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error deleting trip entry:', err);
      setErrorMessage(err.message || 'Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Driver Entry"
      subtitle="Modify or reassign this trip record across the database"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. DRIVER SELECTION */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Assigned Driver *</span>
          </label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            required
          >
            <option value="">-- Select Driver --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} {d.username ? `(@${d.username})` : ''} {d.phone ? `• ${d.phone}` : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Reassigning will attribute this trip and its distance/earnings to the newly chosen driver.
          </p>
        </div>

        {/* 2. COMPANY & VEHICLE ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Client Company *</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="">-- Select Company --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.billing_rate_per_km ? `(₹${c.billing_rate_per_km}/km)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fleet Vehicle</span>
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            >
              <option value="">-- No vehicle selected --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} ({v.model} - {v.fuel_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. TRIP DATE */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>Trip Date (Asia/Kolkata) *</span>
          </label>
          <input
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            required
          />
        </div>

        {/* 4. TRIP TYPE SELECTOR */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Trip Journey Type *</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTripType('ONE_SIDE')}
              className={`p-3 rounded-xl border text-left transition-all ${
                tripType === 'ONE_SIDE'
                  ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500 text-blue-900'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase">1-Side Trip</span>
                <Badge variant="info" size="sm">
                  x2 Return
                </Badge>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Multiplies KM by 2 for round-trip return billing</div>
            </button>

            <button
              type="button"
              onClick={() => setTripType('TWO_SIDE')}
              className={`p-3 rounded-xl border text-left transition-all ${
                tripType === 'TWO_SIDE'
                  ? 'border-purple-600 bg-purple-50/70 ring-1 ring-purple-500 text-purple-900'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase">2-Side Trip</span>
                <Badge variant="purple" size="sm">
                  x1 Actual
                </Badge>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Both pickup &amp; drop included (multiplier 1)</div>
            </button>
          </div>
        </div>

        {/* 5. DISTANCE CALCULATOR */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                1-Way Entered KM *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={oneSideKm}
                onChange={(e) => setOneSideKm(e.target.value)}
                placeholder="e.g. 25.5"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Calculated Total Distance</span>
                <button
                  type="button"
                  onClick={() => setIsCustomTotal(!isCustomTotal)}
                  className="text-[10px] text-blue-600 hover:underline capitalize"
                >
                  {isCustomTotal ? 'Use Auto Calculation' : 'Override Total'}
                </button>
              </label>

              {isCustomTotal ? (
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={customTotalKm}
                  onChange={(e) => setCustomTotalKm(e.target.value)}
                  placeholder="Custom Total KM"
                  className="w-full px-3.5 py-2.5 bg-white border border-blue-400 rounded-xl text-slate-900 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              ) : (
                <div className="w-full px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 font-mono font-black text-sm flex items-center justify-between">
                  <span>{calculatedTotalKm} KM</span>
                  <span className="text-[11px] font-normal text-blue-600">
                    ({parsedKm} × {multiplier})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* FINANCIAL PREVIEW */}
          {billingRate > 0 && (
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Rate: <strong>₹{billingRate}/KM</strong>
              </span>
              <span className="text-emerald-700 font-bold font-mono">
                Est. Revenue: {formatCurrencyINR(estimatedEarnings)}
              </span>
            </div>
          )}
        </div>

        {/* 6. NOTES */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Notes / Route Remarks (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Airport Transfer, Toll paid, Verified by Admin"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* 7. ACTIONS FOOTER */}
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
              {isSaving ? 'Saving Changes...' : 'Save & Update Database'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

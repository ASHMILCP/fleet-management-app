'use client';

import React, { useState } from 'react';
import { FleetStore } from '@/lib/store';
import { UberEntryType } from '@/types';
import { getTodayDateIST, formatCurrencyINR } from '@/lib/timezone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Car, IndianRupee, Calendar, Hash, FileText, CheckCircle, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';

interface AddUberEarningsDialogProps {
  driverId?: string;
  isOpen: boolean;
  onClose: () => void;
  onUberEarningAdded?: () => void;
  initialDate?: string;
}

export const AddUberEarningsDialog: React.FC<AddUberEarningsDialogProps> = ({
  driverId,
  isOpen,
  onClose,
  onUberEarningAdded,
  initialDate,
}) => {
  const drivers = FleetStore.getDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string>(driverId || (drivers[0]?.id || ''));
  const [entryType, setEntryType] = useState<UberEntryType>('UBER_EARNINGS');
  const [amount, setAmount] = useState<string>('');
  const [ridesCount, setRidesCount] = useState<string>('');
  const [date, setDate] = useState<string>(initialDate || getTodayDateIST());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (driverId) {
      setSelectedDriverId(driverId);
    } else if (drivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [driverId, drivers, isOpen]);

  React.useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate, isOpen]);

  const quickAmounts = entryType === 'UBER_RENT' ? [500, 600, 700, 800, 900, 1000] : [500, 1000, 1500, 2000, 2500, 3000];

  const handleSetAmount = (val: number) => {
    setAmount(String(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    const label = entryType === 'UBER_RENT' ? 'Uber rent' : 'Uber earnings';
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert(`Please enter a valid ${label} amount greater than 0`);
      return;
    }

    const effectiveDriverId = driverId || selectedDriverId;
    if (!effectiveDriverId) {
      alert('Please select a driver for this Uber record');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeDuty = FleetStore.getActiveDutySession(effectiveDriverId);
      const driver = FleetStore.getCurrentUser();
      const driverFromList = FleetStore.getDrivers().find((d) => d.id === effectiveDriverId);
      const vehicleId =
        activeDuty?.vehicle_id ||
        (driver?.id === effectiveDriverId ? driver?.assigned_vehicle_id : undefined) ||
        driverFromList?.assigned_vehicle_id ||
        undefined;

      const parsedRides = ridesCount ? parseInt(ridesCount, 10) : null;

      await FleetStore.addUberEarningAsync({
        driver_id: effectiveDriverId,
        vehicle_id: vehicleId,
        duty_session_id: activeDuty?.id || null,
        amount: parsedAmount,
        category: entryType,
        rides_count: parsedRides && !isNaN(parsedRides) ? parsedRides : null,
        earnings_date: date || getTodayDateIST(),
        notes: notes.trim() || undefined,
      });

      // Reset form
      setAmount('');
      setRidesCount('');
      setNotes('');
      setEntryType('UBER_EARNINGS');
      onClose();

      if (onUberEarningAdded) {
        onUberEarningAdded();
      }
    } catch (err: any) {
      alert(`Could not save Uber record: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmountVal = parseFloat(amount) || 0;
  const isRent = entryType === 'UBER_RENT';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRent ? 'Add Uber Rent' : 'Add Uber Earnings'}
      subtitle={
        isRent
          ? 'Log daily vehicle rent for Uber shift (Instant Cloud Sync)'
          : 'Log daily Uber platform payout & completed rides (Instant Cloud Sync)'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PLATFORM BADGE HEADER */}
        <div
          className={`p-4 rounded-2xl text-white flex items-center justify-between border shadow-sm transition-colors ${
            isRent
              ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 border-indigo-700/60'
              : 'bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border-slate-700/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Car className={`w-5 h-5 ${isRent ? 'text-indigo-400' : 'text-emerald-400'}`} />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>{isRent ? 'Uber Vehicle Rent' : 'Uber Partner Earnings'}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase border ${
                    isRent
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isRent ? 'Rent' : 'Payout'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Syncs directly with Supabase cloud &amp; reflects across Admin &amp; Driver devices
              </p>
            </div>
          </div>
        </div>

        {/* UBER ENTRY TYPE DROPDOWN (UBER RENT / UBER EARNINGS) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Uber Option Type <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as UberEntryType)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none pr-10 cursor-pointer"
              required
            >
              <option value="UBER_EARNINGS">Uber Earnings</option>
              <option value="UBER_RENT">Uber Rent</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isRent
              ? 'Vehicle rent fee for operating on Uber platform'
              : 'Completed rides platform payout credited to driver shift'}
          </p>
        </div>

        {/* DRIVER SELECT (For Admin Portal) */}
        {!driverId && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Assign to Driver <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} {d.username ? `(@${d.username})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* AMOUNT (₹) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            {isRent ? 'Uber Rent Amount (₹)' : 'Total Uber Earnings Amount (₹)'} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400 flex items-center">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isRent ? 'e.g. 800' : 'e.g. 1450'}
              className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-lg font-bold font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* QUICK PRESET CHIPS */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Quick Select:</span>
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSetAmount(q)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-medium transition-colors ${
                  isRent
                    ? 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border-slate-200 text-slate-700'
                    : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border-slate-200 text-slate-700'
                }`}
              >
                ₹{q}
              </button>
            ))}
          </div>
        </div>

        {/* DATE & COMPLETED RIDES ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Date (Asia/Kolkata) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Completed Rides <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                value={ridesCount}
                onChange={(e) => setRidesCount(e.target.value)}
                placeholder="e.g. 8"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* NOTES / REMARKS */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Notes / Shift Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isRent ? 'e.g. Daily car rent, Swift Dzire' : 'e.g. Peak hours, airport drop, Uber Go'}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* REAL-TIME PREVIEW CARD */}
        {parsedAmountVal > 0 && (
          <div
            className={`border rounded-xl p-3 flex items-center justify-between text-xs ${
              isRent
                ? 'bg-indigo-50/70 border-indigo-200/80'
                : 'bg-emerald-50/70 border-emerald-200/80'
            }`}
          >
            <div className={`flex items-center gap-2 ${isRent ? 'text-indigo-900' : 'text-emerald-900'}`}>
              <TrendingUp className={`w-4 h-4 shrink-0 ${isRent ? 'text-indigo-600' : 'text-emerald-600'}`} />
              <div>
                <span className="font-bold">{isRent ? 'Uber Rent Entry:' : 'Uber Earnings Credit:'}</span>{' '}
                <span>{isRent ? 'Recorded for fleet vehicle rent' : "Adds to today's shift revenue"}</span>
              </div>
            </div>
            <div className={`text-sm font-black font-mono ${isRent ? 'text-indigo-950' : 'text-emerald-950'}`}>
              {isRent ? '' : '+'}{formatCurrencyINR(parsedAmountVal)}
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className={
              isRent
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-md shadow-emerald-600/20'
            }
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            {isRent ? 'Save Uber Rent' : 'Save Uber Earnings'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

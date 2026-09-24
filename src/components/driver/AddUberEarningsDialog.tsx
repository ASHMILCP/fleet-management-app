'use client';

import React, { useState } from 'react';
import { FleetStore } from '@/lib/store';
import { getTodayDateIST, formatCurrencyINR } from '@/lib/timezone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Car, IndianRupee, Calendar, Hash, FileText, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';

interface AddUberEarningsDialogProps {
  driverId: string;
  isOpen: boolean;
  onClose: () => void;
  onUberEarningAdded?: () => void;
}

export const AddUberEarningsDialog: React.FC<AddUberEarningsDialogProps> = ({
  driverId,
  isOpen,
  onClose,
  onUberEarningAdded,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [ridesCount, setRidesCount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateIST());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const quickAmounts = [500, 1000, 1500, 2000, 2500, 3000];

  const handleQuickAdd = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + val));
  };

  const handleSetAmount = (val: number) => {
    setAmount(String(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid Uber earnings amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeDuty = FleetStore.getActiveDutySession(driverId);
      const driver = FleetStore.getCurrentUser();
      const driverFromList = FleetStore.getDrivers().find((d) => d.id === driverId);
      const vehicleId =
        activeDuty?.vehicle_id ||
        driver?.assigned_vehicle_id ||
        driverFromList?.assigned_vehicle_id ||
        undefined;

      const parsedRides = ridesCount ? parseInt(ridesCount, 10) : null;

      await FleetStore.addUberEarningAsync({
        driver_id: driverId,
        vehicle_id: vehicleId,
        duty_session_id: activeDuty?.id || null,
        amount: parsedAmount,
        rides_count: parsedRides && !isNaN(parsedRides) ? parsedRides : null,
        earnings_date: date || getTodayDateIST(),
        notes: notes.trim() || undefined,
      });

      // Reset form
      setAmount('');
      setRidesCount('');
      setNotes('');
      onClose();

      if (onUberEarningAdded) {
        onUberEarningAdded();
      }
    } catch (err: any) {
      alert(`Could not save Uber earnings: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmountVal = parseFloat(amount) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Uber Earnings"
      subtitle="Log your daily Uber platform payout & completed rides"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PLATFORM BADGE HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 rounded-2xl text-white flex items-center justify-between border border-slate-700/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>Uber Partner Earnings</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-semibold uppercase">
                  Payout
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Syncs directly with fleet management &amp; admin reporting
              </p>
            </div>
          </div>
        </div>

        {/* AMOUNT (₹) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Total Uber Earnings Amount (₹) <span className="text-rose-500">*</span>
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
              placeholder="e.g. 1450"
              className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-lg font-bold font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* QUICK PRESET CHIPS */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Quick Add:</span>
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSetAmount(q)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 font-mono font-medium text-slate-700 transition-colors"
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
              Completed Rides / Trips <span className="text-slate-400 font-normal lowercase">(optional)</span>
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
            Notes / Shift Details <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Airport peak hours, toll included, Uber Go"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* REAL-TIME PREVIEW CARD */}
        {parsedAmountVal > 0 && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Total Earnings Credit:</span>{' '}
                <span>Adds to today&apos;s shift revenue</span>
              </div>
            </div>
            <div className="text-sm font-black font-mono text-emerald-950">
              +{formatCurrencyINR(parsedAmountVal)}
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-md shadow-emerald-600/20"
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            Save Uber Earnings
          </Button>
        </div>
      </form>
    </Modal>
  );
};

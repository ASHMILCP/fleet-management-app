'use client';

import React, { useState, useEffect } from 'react';
import { DutySession, Vehicle } from '@/types';
import { FleetStore } from '@/lib/store';
import { formatTimeIST, formatDateTimeIST } from '@/lib/timezone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Play, Square, Clock, Car, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DutyToggleProps {
  driverId: string;
  onDutyChanged?: () => void;
}

export const DutyToggle: React.FC<DutyToggleProps> = ({ driverId, onDutyChanged }) => {
  const [activeSession, setActiveSession] = useState<DutySession | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [startNotes, setStartNotes] = useState<string>('');
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadDutyState = async () => {
    await FleetStore.syncWithSupabase();
    const active = await FleetStore.getActiveDutySessionAsync(driverId);
    setActiveSession(active);
    const activeVehicles = FleetStore.getActiveVehicles();
    setVehicles(activeVehicles);

    if (active?.vehicle_id) {
      setSelectedVehicleId(active.vehicle_id);
    } else if (activeVehicles.length > 0) {
      setSelectedVehicleId(activeVehicles[0].id);
    }
  };

  useEffect(() => {
    loadDutyState();
  }, [driverId]);

  // Live timer tick when on duty
  useEffect(() => {
    if (!activeSession || !activeSession.start_time) {
      setElapsedTime('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(activeSession.start_time).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - start) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartDuty = async () => {
    setIsSubmitting(true);
    try {
      await FleetStore.startDutyAsync(driverId, selectedVehicleId || undefined, startNotes);
      setIsStartModalOpen(false);
      setStartNotes('');
      await loadDutyState();
      if (onDutyChanged) onDutyChanged();
    } catch (err: any) {
      alert(`Could not start duty on cloud: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndDuty = async () => {
    setIsSubmitting(true);
    try {
      await FleetStore.endDutyAsync(driverId);
      setIsEndModalOpen(false);
      await loadDutyState();
      if (onDutyChanged) onDutyChanged();
    } catch (err: any) {
      alert(`Could not end duty on cloud: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="w-full">
      {activeSession ? (
        // ON DUTY STATE
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-500/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
                </span>
                <Badge variant="warning" size="md" className="bg-white/20 text-white border-white/30">
                  CURRENTLY ON DUTY
                </Badge>
                {assignedVehicle && (
                  <span className="text-xs bg-black/20 px-2.5 py-1 rounded-full text-amber-100 flex items-center gap-1 font-mono">
                    <Car className="w-3.5 h-3.5" />
                    {assignedVehicle.registration_number}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <div className="text-3xl sm:text-5xl font-extrabold tracking-tight font-mono">
                  {elapsedTime}
                </div>
                <span className="text-xs uppercase tracking-wider text-amber-100/90 font-medium">
                  Elapsed Time
                </span>
              </div>

              <p className="text-sm text-amber-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-200" />
                Shift started at <strong className="text-white">{formatTimeIST(activeSession.start_time)}</strong> (IST)
              </p>
            </div>

            {/* BIG END DUTY BUTTON */}
            <button
              onClick={() => setIsEndModalOpen(true)}
              className="w-full md:w-auto px-8 py-5 bg-white text-rose-700 hover:bg-rose-50 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg border-2 border-rose-200 active:scale-95 group"
            >
              <div className="w-4 h-4 rounded-sm bg-rose-600 group-hover:scale-110 transition-transform"></div>
              <span>END DUTY SESSION</span>
            </button>
          </div>
        </div>
      ) : (
        // OFF DUTY STATE
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-600/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="md" className="bg-white/20 text-white border-white/30">
                  OFF DUTY
                </Badge>
                <span className="text-xs text-emerald-100">Ready to start today&apos;s shift</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Ready to hit the road?
              </h2>
              <p className="text-sm text-emerald-100/90 max-w-md">
                Starting duty activates trip tracking, time logging in IST, and fleet dispatch connectivity.
              </p>
            </div>

            {/* BIG START DUTY BUTTON */}
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="w-full md:w-auto px-10 py-5 bg-white text-emerald-700 hover:bg-emerald-50 font-extrabold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 text-xl border-2 border-emerald-100 active:scale-95 group"
            >
              <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform text-emerald-600" />
              <span>START DUTY</span>
            </button>
          </div>
        </div>
      )}

      {/* START DUTY MODAL */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title="Start Shift / Duty"
        subtitle="Confirm your vehicle and start timestamp"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Vehicle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.model} ({v.fuel_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Shift Notes (Optional)
            </label>
            <input
              type="text"
              value={startNotes}
              onChange={(e) => setStartNotes(e.target.value)}
              placeholder="e.g. Morning airport shuttle route"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Duty start timestamp will be logged automatically in <strong>Asia/Kolkata (IST)</strong>.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsStartModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleStartDuty}
              isLoading={isSubmitting}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Confirm &amp; Start Duty
            </Button>
          </div>
        </div>
      </Modal>

      {/* END DUTY CONFIRMATION MODAL */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title="End Duty Session?"
        subtitle="Confirm shift completion and close active session"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Are you sure you want to end your duty?</p>
              <p className="text-xs text-amber-700 mt-1">
                Your total duty duration for this shift is <strong>{elapsedTime}</strong>. Any subsequent trips will require starting a new duty session.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEndModalOpen(false)}>
              Keep Working
            </Button>
            <Button
              variant="danger"
              onClick={handleEndDuty}
              isLoading={isSubmitting}
              leftIcon={<Square className="w-4 h-4" />}
            >
              Yes, End Duty Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

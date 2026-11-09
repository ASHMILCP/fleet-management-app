'use client';

import React, { useState, useEffect } from 'react';
import { DutySession, Vehicle, DutyType } from '@/types';
import { FleetStore } from '@/lib/store';
import { formatTimeIST } from '@/lib/timezone';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Play,
  Square,
  Clock,
  Car,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { broadcastDutyNotification } from '@/lib/notifications';

interface DutyToggleProps {
  driverId: string;
  onDutyChanged?: () => void;
}

export const DutyToggle: React.FC<DutyToggleProps> = ({ driverId, onDutyChanged }) => {
  const [activeSession, setActiveSession] = useState<DutySession | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [startNotes, setStartNotes] = useState<string>('');

  // Modals
  const [isStartNavyModalOpen, setIsStartNavyModalOpen] = useState<boolean>(false);
  const [isStartUberModalOpen, setIsStartUberModalOpen] = useState<boolean>(false);
  const [isEndNavyModalOpen, setIsEndNavyModalOpen] = useState<boolean>(false);
  const [isEndUberModalOpen, setIsEndUberModalOpen] = useState<boolean>(false);

  // Uber Logout Daily KM
  const [uberDailyKm, setUberDailyKm] = useState<string>('');
  const [uberLogoutNotes, setUberLogoutNotes] = useState<string>('');
  const [kmError, setKmError] = useState<string>('');

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
    } else {
      const driver = FleetStore.getDrivers().find((d) => d.id === driverId) || FleetStore.getCurrentUser();
      if (driver?.assigned_vehicle_id) {
        setSelectedVehicleId(driver.assigned_vehicle_id);
      } else if (activeVehicles.length > 0) {
        setSelectedVehicleId(activeVehicles[0].id);
      }
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

  // START NAVY DUTY
  const handleStartNavyDuty = async () => {
    setIsSubmitting(true);
    try {
      const session = await FleetStore.startDutyAsync(
        driverId,
        selectedVehicleId || undefined,
        startNotes,
        'NAVY'
      );
      setIsStartNavyModalOpen(false);

      const driver = FleetStore.getDrivers().find((d) => d.id === driverId) || FleetStore.getCurrentUser();
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      await broadcastDutyNotification({
        id: `duty-start-${session?.id || Date.now()}`,
        type: 'DUTY_STARTED',
        duty_type: 'NAVY',
        driver_id: driverId,
        driver_name: driver?.full_name || 'Driver',
        driver_username: driver?.username,
        driver_phone: driver?.phone,
        vehicle_reg: vehicle?.registration_number,
        session_id: session?.id,
        timestamp: session?.start_time || new Date().toISOString(),
        notes: startNotes || undefined,
      });

      setStartNotes('');
      await loadDutyState();
      if (onDutyChanged) onDutyChanged();
    } catch (err: any) {
      alert(`Could not start Navy duty: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // START UBER DUTY (AUTOMATICALLY LOGS OUT NAVY DUTY IF ACTIVE!)
  const handleStartUberDuty = async () => {
    setIsSubmitting(true);
    try {
      const session = await FleetStore.startDutyAsync(
        driverId,
        selectedVehicleId || undefined,
        startNotes,
        'UBER'
      );
      setIsStartUberModalOpen(false);

      const driver = FleetStore.getDrivers().find((d) => d.id === driverId) || FleetStore.getCurrentUser();
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      await broadcastDutyNotification({
        id: `duty-start-${session?.id || Date.now()}`,
        type: 'DUTY_STARTED',
        duty_type: 'UBER',
        driver_id: driverId,
        driver_name: driver?.full_name || 'Driver',
        driver_username: driver?.username,
        driver_phone: driver?.phone,
        vehicle_reg: vehicle?.registration_number,
        session_id: session?.id,
        timestamp: session?.start_time || new Date().toISOString(),
        notes: startNotes || undefined,
      });

      setStartNotes('');
      await loadDutyState();
      if (onDutyChanged) onDutyChanged();
    } catch (err: any) {
      alert(`Could not start Uber duty: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // LOGOUT NAVY DUTY
  const handleEndNavyDuty = async () => {
    setIsSubmitting(true);
    try {
      const driver = FleetStore.getDrivers().find((d) => d.id === driverId) || FleetStore.getCurrentUser();
      const vehicle = vehicles.find((v) => v.id === activeSession?.vehicle_id);
      const finishedDuration = elapsedTime;
      const endTimestamp = new Date().toISOString();

      await FleetStore.endDutyAsync(driverId);
      setIsEndNavyModalOpen(false);

      await broadcastDutyNotification({
        id: `duty-end-${activeSession?.id || Date.now()}-${Date.now()}`,
        type: 'DUTY_ENDED',
        duty_type: 'NAVY',
        driver_id: driverId,
        driver_name: driver?.full_name || 'Driver',
        driver_username: driver?.username,
        driver_phone: driver?.phone,
        vehicle_reg: vehicle?.registration_number,
        session_id: activeSession?.id,
        timestamp: endTimestamp,
        duration_text: finishedDuration,
      });

      await loadDutyState();
      if (onDutyChanged) onDutyChanged();
    } catch (err: any) {
      alert(`Could not end Navy duty: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // LOGOUT UBER DUTY WITH DAILY TOTAL KM RUN TODAY
  const handleEndUberDuty = async () => {
    const parsedKm = parseFloat(uberDailyKm);
    if (isNaN(parsedKm) || parsedKm <= 0) {
      setKmError('Please enter a valid Daily Total KM run today (greater than 0)');
      return;
    }

    setIsSubmitting(true);
    setKmError('');

    try {
      const driver = FleetStore.getDrivers().find((d) => d.id === driverId) || FleetStore.getCurrentUser();
      const vehicle = vehicles.find((v) => v.id === activeSession?.vehicle_id);
      const finishedDuration = elapsedTime;
      const endTimestamp = new Date().toISOString();

      await FleetStore.endDutyAsync(driverId, parsedKm, uberLogoutNotes.trim() || undefined);
      setIsEndUberModalOpen(false);

      await broadcastDutyNotification({
        id: `duty-end-${activeSession?.id || Date.now()}-${Date.now()}`,
        type: 'DUTY_ENDED',
        duty_type: 'UBER',
        driver_id: driverId,
        driver_name: driver?.full_name || 'Driver',
        driver_username: driver?.username,
        driver_phone: driver?.phone,
        vehicle_reg: vehicle?.registration_number,
        session_id: activeSession?.id,
        timestamp: endTimestamp,
        duration_text: finishedDuration,
        total_km: parsedKm,
      });

      setUberDailyKm('');
      setUberLogoutNotes('');
      await loadDutyState();
      if (onDutyChanged) onDutyChanged();
    } catch (err: any) {
      alert(`Could not end Uber duty: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const isNavyActive = activeSession && (activeSession.duty_type || 'NAVY') === 'NAVY';
  const isUberActive = activeSession && activeSession.duty_type === 'UBER';

  return (
    <div className="w-full space-y-4">
      {/* 1. ON NAVY DUTY STATE */}
      {isNavyActive && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-700/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
                </span>
                <Badge variant="info" size="md" className="bg-white/20 text-white border-white/30 font-bold uppercase tracking-wider">
                  NAVY DUTY ACTIVE
                </Badge>
                {assignedVehicle && (
                  <span className="text-xs bg-black/25 px-2.5 py-1 rounded-full text-blue-100 flex items-center gap-1 font-mono">
                    <Car className="w-3.5 h-3.5" />
                    {assignedVehicle.registration_number}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <div className="text-3xl sm:text-5xl font-extrabold tracking-tight font-mono">
                  {elapsedTime}
                </div>
                <span className="text-xs uppercase tracking-wider text-blue-200 font-medium">
                  Navy Shift Elapsed
                </span>
              </div>

              <p className="text-sm text-blue-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-200" />
                Shift started at <strong className="text-white font-mono">{formatTimeIST(activeSession.start_time)}</strong> (IST)
              </p>
            </div>

            {/* ACTION BUTTONS: END NAVY OR SWITCH DIRECTLY TO UBER */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* UBER LOGIN SWITCH (AUTOMATICALLY CLOSES NAVY DUTY) */}
              <button
                type="button"
                onClick={() => setIsStartUberModalOpen(true)}
                className="px-6 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 text-sm border border-slate-700 active:scale-95 group"
                title="Automatically logout Navy Duty and start Uber duty"
              >
                <Car className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Switch to Uber Login</span>
              </button>

              {/* LOGOUT NAVY DUTY */}
              <button
                type="button"
                onClick={() => setIsEndNavyModalOpen(true)}
                className="px-6 py-4 bg-white text-rose-700 hover:bg-rose-50 font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm border-2 border-rose-200 active:scale-95"
              >
                <Square className="w-4 h-4 text-rose-600 fill-current" />
                <span>Logout Navy Duty</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ON UBER DUTY STATE */}
      {isUberActive && (
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/30 border border-emerald-500/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                </span>
                <Badge variant="success" size="md" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold uppercase tracking-wider">
                  UBER DUTY ACTIVE
                </Badge>
                {assignedVehicle && (
                  <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-emerald-200 flex items-center gap-1 font-mono">
                    <Car className="w-3.5 h-3.5" />
                    {assignedVehicle.registration_number}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <div className="text-3xl sm:text-5xl font-extrabold tracking-tight font-mono text-emerald-400">
                  {elapsedTime}
                </div>
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-medium">
                  Uber Shift Duration
                </span>
              </div>

              <p className="text-sm text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Uber login started at <strong className="text-white font-mono">{formatTimeIST(activeSession.start_time)}</strong> (IST)
              </p>
            </div>

            {/* END UBER DUTY BUTTON (PROMPTS FOR DAILY TOTAL KM RUN TODAY) */}
            <div className="w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setUberDailyKm('');
                  setKmError('');
                  setIsEndUberModalOpen(true);
                }}
                className="w-full sm:w-auto px-8 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 text-base border border-emerald-300 active:scale-95 group"
              >
                <Gauge className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>LOGOUT UBER &amp; SUBMIT DAILY KM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. OFF DUTY STATE: TWO SEPARATE LOGIN CHOICES */}
      {!activeSession && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NAVY DUTY LOGIN CARD */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-blue-600/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="neutral" size="sm" className="bg-white/20 text-white border-white/30 uppercase tracking-wider">
                  Corporate / Fleet Shift
                </Badge>
                <Navigation className="w-6 h-6 text-blue-200 opacity-80" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Navy Duty Login</h3>
              <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                Start your scheduled Navy corporate fleet duty. Records shift working hours and vehicle tracking in IST.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-blue-200 font-mono">
                {assignedVehicle ? assignedVehicle.registration_number : 'Assigned Fleet Vehicle'}
              </span>
              <button
                type="button"
                onClick={() => setIsStartNavyModalOpen(true)}
                className="px-5 py-3 rounded-xl bg-white text-blue-700 font-black text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2 group active:scale-95"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                <span>Start Navy Duty</span>
              </button>
            </div>
          </div>

          {/* UBER DUTY LOGIN CARD */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-emerald-950/20 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 uppercase tracking-wider">
                  On-Demand Platform
                </Badge>
                <Car className="w-6 h-6 text-emerald-400 opacity-80" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black tracking-tight">Uber Login</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md uppercase border border-emerald-500/30">
                  Auto-Handover
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Log in to Uber shift. Automatically closes any active Navy Duty and prompts for Daily Total KM run upon shift logout.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {assignedVehicle ? assignedVehicle.registration_number : 'Assigned Fleet Vehicle'}
              </span>
              <button
                type="button"
                onClick={() => setIsStartUberModalOpen(true)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm transition-all shadow-sm flex items-center gap-2 group active:scale-95"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                <span>Start Uber Duty</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: START NAVY DUTY */}
      <Modal
        isOpen={isStartNavyModalOpen}
        onClose={() => setIsStartNavyModalOpen(false)}
        title="Start Navy Duty Shift"
        subtitle="Confirm vehicle and start timestamp"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Fleet Vehicle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              placeholder="e.g. Morning Navy duty shift"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Navy duty will begin and record working hours in <strong>Asia/Kolkata (IST)</strong>.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsStartNavyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStartNavyDuty}
              isLoading={isSubmitting}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Confirm &amp; Start Navy Duty
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: START UBER DUTY (EXPLICIT AUTO-LOGOUT NOTICE IF NAVY IS ACTIVE) */}
      <Modal
        isOpen={isStartUberModalOpen}
        onClose={() => setIsStartUberModalOpen(false)}
        title="Start Uber Duty"
        subtitle="Confirm vehicle to activate Uber shift"
      >
        <div className="space-y-4">
          {/* NOTICE: IF NAVY DUTY IS CURRENTLY ACTIVE */}
          {isNavyActive && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-black text-amber-800 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Automatic Navy Duty Logout</span>
              </div>
              <p className="leading-relaxed">
                You are currently active on <strong>Navy Duty</strong> ({elapsedTime}). Starting Uber duty will <strong>automatically logout / end your Navy duty session</strong> and timestamp your shift handover in IST.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Fleet Vehicle
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
              Uber Shift Notes (Optional)
            </label>
            <input
              type="text"
              value={startNotes}
              onChange={(e) => setStartNotes(e.target.value)}
              placeholder="e.g. Afternoon Uber platform shift"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsStartUberModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleStartUberDuty}
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              leftIcon={<Play className="w-4 h-4" />}
            >
              {isNavyActive ? 'Logout Navy & Start Uber' : 'Start Uber Duty'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: LOGOUT NAVY DUTY */}
      <Modal
        isOpen={isEndNavyModalOpen}
        onClose={() => setIsEndNavyModalOpen(false)}
        title="Logout Navy Duty?"
        subtitle="Confirm completion of current Navy shift"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">End Navy duty session?</p>
              <p className="text-xs text-amber-700 mt-1">
                Your Navy duty duration for this shift is <strong>{elapsedTime}</strong>. Total working minutes will be saved to your daily summary and admin reports.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEndNavyModalOpen(false)}>
              Keep Working
            </Button>
            <Button
              variant="danger"
              onClick={handleEndNavyDuty}
              isLoading={isSubmitting}
              leftIcon={<Square className="w-4 h-4" />}
            >
              Confirm Logout Navy Duty
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: LOGOUT UBER DUTY (WITH MANDATORY DAILY TOTAL KM RUN TODAY) */}
      <Modal
        isOpen={isEndUberModalOpen}
        onClose={() => setIsEndUberModalOpen(false)}
        title="Logout Uber & Submit Daily Total KM"
        subtitle="Enter today's total KM driven during your Uber shift"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
            <div>
              <span className="font-semibold block">Uber Shift Duration:</span>
              <span className="font-mono text-base font-extrabold text-emerald-800">{elapsedTime}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Current Vehicle:</span>
              <span className="font-mono font-bold text-slate-800">{assignedVehicle?.registration_number || 'Fleet Car'}</span>
            </div>
          </div>

          {/* DAILY TOTAL KM RUN TODAY INPUT */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <span>Daily Total KM Run Today *</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={uberDailyKm}
                onChange={(e) => {
                  setUberDailyKm(e.target.value);
                  setKmError('');
                }}
                placeholder="e.g. 145.5"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-emerald-500/40 focus:border-emerald-600 rounded-xl text-slate-900 font-mono font-extrabold text-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                required
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                KM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Enter the total odometer / trip meter KM driven today during your Uber shift.
            </p>
          </div>

          {kmError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{kmError}</span>
            </div>
          )}

          {/* OPTIONAL NOTES */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Notes / Shift Details (Optional)
            </label>
            <input
              type="text"
              value={uberLogoutNotes}
              onChange={(e) => setUberLogoutNotes(e.target.value)}
              placeholder="e.g. Full day city trips completed"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEndUberModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleEndUberDuty}
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Submit KM &amp; Logout Uber
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FleetStore } from '@/lib/store';
import { Copy, Check, Download, Upload, Smartphone, Laptop, RefreshCw } from 'lucide-react';

interface SyncDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export const SyncDataModal: React.FC<SyncDataModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const getExportString = () => {
    if (typeof window === 'undefined') return '';
    try {
      const data = {
        drivers: FleetStore.getDrivers(),
        vehicles: FleetStore.getVehicles(),
        companies: FleetStore.getCompanies(),
        duty_sessions: FleetStore.getDutySessions(),
        trips: FleetStore.getTrips(),
        fuel_logs: FleetStore.getFuelLogs(),
        timestamp: new Date().toISOString(),
      };
      return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    } catch {
      return '';
    }
  };

  const handleCopy = () => {
    const code = getExportString();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    if (!importCode.trim()) {
      alert('Please paste the Fleet Sync Code generated from your laptop');
      return;
    }

    try {
      const jsonStr = decodeURIComponent(escape(atob(importCode.trim())));
      const parsed = JSON.parse(jsonStr);

      if (!parsed.drivers || !Array.isArray(parsed.drivers)) {
        throw new Error('Invalid sync code format');
      }

      FleetStore.importFleetData(parsed);
      setStatusMsg('✅ Fleet data successfully synced to this device!');
      onSyncComplete();
      setTimeout(() => {
        onClose();
        setStatusMsg('');
        setImportCode('');
      }, 1500);
    } catch {
      alert('Invalid or corrupted Fleet Sync Code. Please re-copy the code from your laptop admin panel.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Instant Fleet Data Sync (Laptop ↔ Mobile)"
      subtitle="Transfer drivers, passwords, vehicles & companies between any phone and laptop instantly"
    >
      <div className="space-y-5 text-sm">
        {/* STEP 1: EXPORT FROM LAPTOP */}
        <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-blue-900 text-xs uppercase tracking-wider">
            <Laptop className="w-4 h-4 text-blue-600" />
            <span>Step 1: Export Data from Laptop / Primary Admin Device</span>
          </div>
          <p className="text-xs text-slate-600">
            Click below to copy your complete fleet database code (all drivers, passwords, vehicles, and companies):
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {copied ? 'Sync Code Copied to Clipboard!' : 'Copy Fleet Sync Code'}
          </Button>
        </div>

        {/* STEP 2: IMPORT ON MOBILE PHONE */}
        <form onSubmit={handleImport} className="p-4 bg-slate-100/90 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            <span>Step 2: Import Data on Mobile Phone</span>
          </div>
          <p className="text-xs text-slate-600">
            Paste the Fleet Sync Code here on your mobile phone to instantly enable all driver logins:
          </p>
          <textarea
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="Paste Fleet Sync Code here..."
            rows={3}
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          {statusMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold">
              {statusMsg}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            className="w-full"
          >
            Apply Sync Data to Device
          </Button>
        </form>
      </div>
    </Modal>
  );
};

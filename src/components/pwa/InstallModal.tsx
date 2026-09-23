'use client';

import React, { useState, useEffect } from 'react';
import { usePwa } from './PwaContext';
import {
  X,
  Share2,
  PlusSquare,
  Sparkles,
  Smartphone,
  Download,
  CheckCircle2,
  ArrowRight,
  MoreVertical,
  Compass,
  Truck
} from 'lucide-react';

export const InstallModal: React.FC = () => {
  const { installModalOpen, closeInstallModal, isIos, promptInstall } = usePwa();
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (isIos) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, [isIos]);

  if (!installModalOpen) return null;

  const handleInstallClick = async () => {
    const success = await promptInstall();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        closeInstallModal();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP ACCENT HEADER */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 pt-6 pb-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Add to Home Screen
                  <span className="text-[10px] uppercase font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                    Web App
                  </span>
                </h3>
                <p className="text-xs text-blue-100/90 font-medium">
                  Use FleetPro like a native mobile app on your phone
                </p>
              </div>
            </div>
            <button
              onClick={closeInstallModal}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DEVICE SWITCHER TABS */}
          <div className="flex bg-black/20 p-1 rounded-xl mt-5 gap-1">
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              iPhone &amp; iPad (iOS)
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'android'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Android Phone
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {installSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">App Installed Successfully!</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                FleetPro has been added to your phone. You can launch it directly from your home screen.
              </p>
            </div>
          ) : activeTab === 'ios' ? (
            /* IOS SAFARI INSTRUCTIONS */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                <Compass className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  Open this page in <strong className="font-bold">Safari</strong> on your iPhone or iPad. Follow the 3 steps below:
                </p>
              </div>

              {/* STEP 1 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  1
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Tap the Share Button</span>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200">
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Located in the Safari bottom navigation bar (or top bar on iPad).
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  2
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Select &ldquo;Add to Home Screen&rdquo;</span>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                      <PlusSquare className="w-3 h-3" />
                      <span>Add</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    Scroll down through the share sheet actions until you see <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  3
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs font-bold text-slate-800">Tap &ldquo;Add&rdquo; in Top Right Corner</span>
                  <p className="text-xs text-slate-500 leading-normal">
                    Confirm by tapping <strong className="text-blue-600 font-bold">&ldquo;Add&rdquo;</strong>. The FleetPro app icon will immediately appear on your Home Screen!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ANDROID INSTRUCTIONS */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100/60 px-3 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  Instant 1-Click Install
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Click the button below to prompt Android Chrome to install FleetPro directly to your app drawer and home screen.
                </p>
                <button
                  onClick={handleInstallClick}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Install FleetPro App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* MANUAL ANDROID BACKUP STEPS */}
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Or via Chrome menu:
                </span>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 text-xs text-slate-600">
                  <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </div>
                  <span>1. Tap the <strong>three dots (⋮)</strong> in Chrome at top-right.</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 text-xs text-slate-600">
                  <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <span>2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                </div>
              </div>
            </div>
          )}

          {/* BENEFIT HIGHLIGHTS */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
              Why add to home screen?
            </h5>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Full-screen app view
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                1-tap quick launch
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Fast cached loading
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                No app store required
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={closeInstallModal}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

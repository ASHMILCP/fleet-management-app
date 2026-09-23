'use client';

import React from 'react';
import { usePwa } from './PwaContext';
import { Truck, X, PlusCircle, Smartphone } from 'lucide-react';

export const InstallPromptBanner: React.FC = () => {
  const {
    isInstalled,
    isBannerDismissed,
    dismissBanner,
    openInstallModal,
    isIos,
  } = usePwa();

  if (isInstalled || isBannerDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 z-40 max-w-md animate-slideUp">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-xl shadow-slate-950/20 border border-slate-700/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black tracking-tight text-white truncate">
                FleetPro Web App
              </h4>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30 shrink-0">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              {isIos ? 'Add to iPhone Home Screen' : 'Install for faster mobile access'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openInstallModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-sm shadow-blue-600/40 transition-all"
          >
            {isIos ? <Smartphone className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
            <span>Install</span>
          </button>
          <button
            onClick={dismissBanner}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextValue {
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  installModalOpen: boolean;
  isBannerDismissed: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  dismissBanner: () => void;
  promptInstall: () => Promise<boolean>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

const STORAGE_KEY_BANNER_DISMISSED = 'fleetpro_pwa_banner_dismissed_at';

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(true); // default true until client checks

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone / already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // Detect device platform
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const androidDevice = /android/.test(ua);
    const mobileDevice = iosDevice || androidDevice || /mobile|tablet/.test(ua) || window.innerWidth < 768;

    setIsIos(iosDevice);
    setIsAndroid(androidDevice);
    setIsMobile(mobileDevice);

    // Check banner dismissal timestamp (suppress for 3 days after dismiss)
    const dismissedAt = localStorage.getItem(STORAGE_KEY_BANNER_DISMISSED);
    if (dismissedAt) {
      const elapsedDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (elapsedDays < 3) {
        setIsBannerDismissed(true);
      } else {
        setIsBannerDismissed(false);
      }
    } else {
      setIsBannerDismissed(false);
    }

    // Android/Desktop Chrome install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration skipped or failed:', err);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setInstallModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setInstallModalOpen(false);
  }, []);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY_BANNER_DISMISSED, Date.now().toString());
    } catch {
      // Ignore local storage error
    }
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setInstallModalOpen(false);
          return true;
        }
      } catch (err) {
        console.error('[PWA] Install prompt error:', err);
      }
    }
    // If deferredPrompt is not available (like iOS or prompt already used), open the visual guide modal
    setInstallModalOpen(true);
    return false;
  }, [deferredPrompt]);

  const isInstallable = !isInstalled && (Boolean(deferredPrompt) || isIos || isAndroid || isMobile);

  return (
    <PwaContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIos,
        isAndroid,
        isMobile,
        installModalOpen,
        isBannerDismissed,
        openInstallModal,
        closeInstallModal,
        dismissBanner,
        promptInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = (): PwaContextValue => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
};

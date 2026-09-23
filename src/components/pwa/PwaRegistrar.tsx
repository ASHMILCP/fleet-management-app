'use client';

import React from 'react';
import { PwaProvider } from './PwaContext';
import { InstallModal } from './InstallModal';
import { InstallPromptBanner } from './InstallPromptBanner';

export const PwaRegistrar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PwaProvider>
      {children}
      <InstallPromptBanner />
      <InstallModal />
    </PwaProvider>
  );
};

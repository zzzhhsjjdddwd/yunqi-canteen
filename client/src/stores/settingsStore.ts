import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  paymentQR: string | null;
  setPaymentQR: (qr: string | null) => void;
  installPromptEvent: BeforeInstallPromptEvent | null;
  setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      paymentQR: null,
      installPromptEvent: null,
      setPaymentQR: (qr) => set({ paymentQR: qr }),
      setInstallPromptEvent: (event) => set({ installPromptEvent: event }),
    }),
    {
      name: 'settings-storage',
    }
  )
);

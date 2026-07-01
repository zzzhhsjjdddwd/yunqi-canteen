import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Address } from '../../../shared/types';

interface AddressState {
  addresses: Address[];
  selectedAddressId: string | null;
  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Address) => void;
  updateAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  setSelectedAddress: (id: string | null) => void;
  clearAddresses: () => void;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      addresses: [],
      selectedAddressId: null,

      setAddresses: (addresses) => set({ addresses }),

      addAddress: (address) => set((state) => ({
        addresses: [address, ...state.addresses],
      })),

      updateAddress: (address) => set((state) => ({
        addresses: state.addresses.map((a) =>
          a.id === address.id ? address : a
        ),
      })),

      removeAddress: (id) => set((state) => ({
        addresses: state.addresses.filter((a) => a.id !== id),
        selectedAddressId: state.selectedAddressId === id ? null : state.selectedAddressId,
      })),

      setSelectedAddress: (id) => set({ selectedAddressId: id }),

      clearAddresses: () => set({ addresses: [], selectedAddressId: null }),
    }),
    {
      name: 'address-storage',
    }
  )
);

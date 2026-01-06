import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Address {
  id: string;
  userId: string;
  label: string; // e.g., "Home", "Work", "Office"
  fullName: string;
  phone: string;
  street: string;
  city: string;
  region: string;
  digitalAddress?: string; // Ghana Post GPS address
  landmark?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddressesState {
  addresses: Address[];

  // Actions
  addAddress: (address: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>) => Address;
  updateAddress: (id: string, updates: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (userId: string, addressId: string) => void;
  getAddressesByUser: (userId: string) => Address[];
  getDefaultAddress: (userId: string) => Address | undefined;
  getAddressById: (id: string) => Address | undefined;
}

export const useAddressesStore = create<AddressesState>()(
  persist(
    (set, get) => ({
      addresses: [],

      addAddress: (addressData) => {
        const now = new Date().toISOString();
        const newAddress: Address = {
          ...addressData,
          id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };

        // If this is the first address or marked as default, set it as default
        const userAddresses = get().addresses.filter(a => a.userId === addressData.userId);
        if (userAddresses.length === 0 || addressData.isDefault) {
          // Unset other defaults if this is being set as default
          set((state) => ({
            addresses: [
              ...state.addresses.map(a =>
                a.userId === addressData.userId ? { ...a, isDefault: false, updatedAt: now } : a
              ),
              { ...newAddress, isDefault: true },
            ],
          }));
        } else {
          set((state) => ({
            addresses: [...state.addresses, newAddress],
          }));
        }

        return newAddress;
      },

      updateAddress: (id, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          addresses: state.addresses.map((address) =>
            address.id === id
              ? { ...address, ...updates, updatedAt: now }
              : address
          ),
        }));
      },

      deleteAddress: (id) => {
        const addressToDelete = get().getAddressById(id);
        set((state) => ({
          addresses: state.addresses.filter((address) => address.id !== id),
        }));

        // If deleted address was default, set another as default
        if (addressToDelete?.isDefault) {
          const userAddresses = get().addresses.filter(a => a.userId === addressToDelete.userId);
          if (userAddresses.length > 0) {
            get().setDefaultAddress(addressToDelete.userId, userAddresses[0].id);
          }
        }
      },

      setDefaultAddress: (userId, addressId) => {
        const now = new Date().toISOString();
        set((state) => ({
          addresses: state.addresses.map((address) =>
            address.userId === userId
              ? { ...address, isDefault: address.id === addressId, updatedAt: now }
              : address
          ),
        }));
      },

      getAddressesByUser: (userId) => {
        return get().addresses
          .filter((address) => address.userId === userId)
          .sort((a, b) => {
            // Default address first
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            // Then by creation date
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
      },

      getDefaultAddress: (userId) => {
        return get().addresses.find(
          (address) => address.userId === userId && address.isDefault
        );
      },

      getAddressById: (id) => {
        return get().addresses.find((address) => address.id === id);
      },
    }),
    {
      name: 'marketplace-addresses',
    }
  )
);

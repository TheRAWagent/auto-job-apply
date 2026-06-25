import { SecureStorage } from "@/lib/secure-storage";
import type { StateCreator } from "zustand";

export interface StorageState {
  secureStorage: SecureStorage,
  getSecureStorage: () => SecureStorage,
}

export const createStorageSlice: StateCreator<StorageState> = ((_set, get) => ({
  secureStorage: new SecureStorage(),
  getSecureStorage: () => get().secureStorage,
}));

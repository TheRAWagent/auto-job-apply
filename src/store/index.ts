import { create } from "zustand";
import { createRouterSlice, type RouterState } from "./router-slice";
import { createAuthSlice, type AuthState } from "./auth-slice";
import { createStorageSlice } from "./storage-slice";
import type { StorageState } from "./storage-slice";

export const useExtensionStore = create<RouterState & AuthState & StorageState >()((...a) => ({
  ...createRouterSlice(...a),
  ...createAuthSlice(...a),
  ...createStorageSlice(...a),
}));

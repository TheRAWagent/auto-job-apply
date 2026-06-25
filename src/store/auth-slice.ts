import type { StateCreator } from "zustand";

export interface AuthState {
  isLoggedIn: boolean
  setLoggedIn: (loggedIn: boolean) => void  
}

export const createAuthSlice: StateCreator<AuthState> = ((set) => ({
  isLoggedIn: false,
  setLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
}));
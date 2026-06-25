import { type StateCreator } from "zustand"

export type Page = "home" | "login" | "onboarding"

export interface RouterState {
  page: Page
  isLoggedIn: boolean
  setPage: (page: Page) => void
  goToLogin: () => void
  goToHome: () => void
  setLoggedIn: (loggedIn: boolean) => void
}

export const createRouterSlice: StateCreator<RouterState> = ((set) => ({
  page: "home",
  isLoggedIn: false,
  setPage: (page) => set({ page }),
  goToLogin: () => set({ page: "login" }),
  goToHome: () => set({ page: "home" }),
  setLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
}));

import { type StateCreator } from "zustand"

export type Page = "home" | "login" | "onboarding" | "settings"

export interface RouterState {
  page: Page
  previousPage: Page | null
  isLoggedIn: boolean
  setPage: (page: Page) => void
  goToLogin: () => void
  goToHome: () => void
  goToSettings: () => void
  goBack: () => void
  setLoggedIn: (loggedIn: boolean) => void
}

export const createRouterSlice: StateCreator<RouterState> = ((set) => ({
  page: "home",
  previousPage: null,
  isLoggedIn: false,
  setPage: (page) => set((state) => ({ page, previousPage: state.page })),
  goToLogin: () => set((state) => ({ page: "login", previousPage: state.page })),
  goToHome: () => set((state) => ({ page: "home", previousPage: state.page })),
  goToSettings: () => set((state) => ({ page: "settings", previousPage: state.page })),
  goBack: () => set((state) => ({ page: state.previousPage ?? "home", previousPage: null })),
  setLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
}));

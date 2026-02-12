import { StateCreator } from "zustand";
import { AppState, SettingsSlice } from "./types";

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  isDarkMode: false,
  fontSize: 16,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setFontSize: (size) => set({ fontSize: size }),
});

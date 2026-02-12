"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppState } from "./stores/types";
import { createAuthSlice } from "./stores/createAuthSlice";
import { createArticleSlice } from "./stores/createArticleSlice";
import { createReviewSlice } from "./stores/createReviewSlice";
import { createSettingsSlice } from "./stores/createSettingsSlice";
import { createAnnouncementSlice } from "./stores/createAnnouncementSlice";

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createArticleSlice(...a),
      ...createReviewSlice(...a),
      ...createSettingsSlice(...a),
      ...createAnnouncementSlice(...a),
    }),
    {
      name: "edreading-storage",
    }
  )
);

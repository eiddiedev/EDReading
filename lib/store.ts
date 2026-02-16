/**
 * 全局状态仓库 (Store)
 * 作用：初始化和导出基于 Zustand 的全局状态管理 Hook。
 * 定义：合并所有子 Slice (Auth, Article, Review 等) 创建单一 Store。
 * 逻辑：
 * 1. 使用 `zustand` 和 `persist` 中间件。
 * 2. 组合多个 Slice 里的状态和方法。
 * 3. 配置持久化存储名称为 `edreading-storage`。
 */
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

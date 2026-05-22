"use client";

import { useCallback, useEffect, useState } from "react";

export const CHINESE_DISPLAY_PREFERENCE_KEY = "word-card-show-chinese-v1";
const CHINESE_DISPLAY_PREFERENCE_EVENT = "edreading:chinese-display-preference";

export function readChineseDisplayPreference(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CHINESE_DISPLAY_PREFERENCE_KEY) !== "0";
}

export function writeChineseDisplayPreference(next: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHINESE_DISPLAY_PREFERENCE_KEY, next ? "1" : "0");
  window.dispatchEvent(
    new CustomEvent<boolean>(CHINESE_DISPLAY_PREFERENCE_EVENT, {
      detail: next,
    })
  );
}

export function useChineseDisplayPreference() {
  const [showChinese, setShowChineseState] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setShowChineseState(readChineseDisplayPreference());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === CHINESE_DISPLAY_PREFERENCE_KEY) {
        setShowChineseState(event.newValue !== "0");
      }
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setShowChineseState(customEvent.detail !== false);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHINESE_DISPLAY_PREFERENCE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHINESE_DISPLAY_PREFERENCE_EVENT, handleCustomEvent);
    };
  }, []);

  const setShowChinese = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setShowChineseState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      writeChineseDisplayPreference(resolved);
      return resolved;
    });
  }, []);

  const toggleShowChinese = useCallback(() => {
    setShowChinese((prev) => !prev);
  }, [setShowChinese]);

  return {
    showChinese,
    setShowChinese,
    toggleShowChinese,
  };
}

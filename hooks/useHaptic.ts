"use client";

import { useCallback } from "react";

export const useHaptic = () => {
  const triggerHaptic = useCallback(() => {
    // Check if navigator.vibrate is supported
    if (typeof window !== "undefined" && navigator.vibrate) {
      // Trigger a short vibration (10ms)
      navigator.vibrate(10);
    }
  }, []);

  return { triggerHaptic };
};

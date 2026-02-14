export interface SRSResult {
  nextReviewAt: Date;
  reviewStage: number;
  masteryLevel: number;
}

/**
 * Calculates the next review time based on the "Day-based 4 AM Refresh" logic.
 * Fixed refresh point: 04:00 AM every day.
 * Logical Day:
 * - If now < 04:00 AM, it counts as "yesterday".
 * - If now >= 04:00 AM, it counts as "today".
 * 
 * Intervals (Days): [1, 2, 4, 7, 15, 30]
 */
export function calculateNextReview(currentStage: number, isCorrect: boolean): SRSResult {
  // Define intervals based on user requirement
  const intervals = [1, 2, 4, 7, 15, 30]; // Days
  const maxStage = intervals.length - 1;

  let newStage = currentStage;

  if (isCorrect) {
    // Increment stage, cap at maxStage
    newStage = Math.min(currentStage + 1, maxStage);
  } else {
    // Reset to 0 on failure (Strict penalty for better retention)
    newStage = 0;
  }

  // 1. Determine "Logical Day" / Base Date
  const now = new Date();
  const currentHour = now.getHours();
  
  let baseDate = new Date(now);
  // If before 4 AM, it's still "yesterday" logically
  if (currentHour < 4) {
    baseDate.setDate(baseDate.getDate() - 1);
  }

  // 2. Get interval days
  let intervalDays = 1;
  if (isCorrect) {
    // Use current stage to determine next interval (e.g. Stage 0 -> 1 day)
    intervalDays = intervals[Math.min(currentStage, maxStage)];
  } else {
    // If failed, reset to base interval (Stage 0 -> 1 day)
    // Note: If you want immediate review for failure, this logic needs changing.
    // But "Day-based" usually implies "Next Day".
    intervalDays = intervals[0];
  }

  // 3. Calculate next review date
  const nextReviewDate = new Date(baseDate);
  nextReviewDate.setDate(baseDate.getDate() + intervalDays);

  // 4. Force set time to 04:00:00
  nextReviewDate.setHours(4, 0, 0, 0);

  // Calculate mastery level (0-100)
  const masteryLevel = Math.round((newStage / maxStage) * 100);

  return {
    nextReviewAt: nextReviewDate,
    reviewStage: newStage,
    masteryLevel
  };
}

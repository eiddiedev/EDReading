export interface SRSResult {
  nextReviewAt: Date;
  reviewStage: number;
  masteryLevel: number;
}

/**
 * Calculates the next review time based on the Ebbinghaus forgetting curve
 * Stage Intervals:
 * Stage 0: 0 (Immediate/1 min)
 * Stage 1: 0.5 days (12 hours)
 * Stage 2: 1 day
 * Stage 3: 2 days
 * Stage 4: 4 days
 * Stage 5: 7 days
 * Stage 6: 15 days
 * Stage 7: 30 days (Graduated)
 */
export function calculateNextReview(currentStage: number, isCorrect: boolean): SRSResult {
  const intervals = [0, 0.5, 1, 2, 4, 7, 15, 30]; // Days
  const maxStage = intervals.length - 1;

  let newStage = currentStage;
  let nextReviewDate = new Date();

  if (isCorrect) {
    // Increment stage, cap at maxStage
    newStage = Math.min(currentStage + 1, maxStage);
    
    // Calculate next review date
    const daysToAdd = intervals[newStage];
    
    // Special Logic: "Overnight Reset"
    // If interval is 1 day (Stage 2), set to tomorrow 4:00 AM
    if (daysToAdd === 1) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(4, 0, 0, 0);
      nextReviewDate = tomorrow;
    } else {
      // Standard interval calculation
      const timeToAdd = daysToAdd * 24 * 60 * 60 * 1000;
      nextReviewDate = new Date(nextReviewDate.getTime() + timeToAdd);
    }
    
  } else {
    // Incorrect: Reset to 0 or penalty
    // Strategy: Reset to 0 for strict Ebbinghaus, or max(0, stage - 2) for softer
    // User requirement: "Stage 重置为 0 (或降级为 max(0, stage - 2))"
    // Let's implement max(0, stage - 2) to be slightly forgiving but effective
    // Actually user prompt says: "Stage 重置为 0 ... next_review_at = now (立即重来)"
    // Let's stick to strict reset to 0 as it's often more effective for "forgotten" items
    newStage = 0;
    // nextReviewDate stays as now() for immediate review
  }

  // Calculate mastery level (0-100) based on stage
  // Stage 0 = 0%, Stage 6 = 100%
  const masteryLevel = Math.round((newStage / maxStage) * 100);

  return {
    nextReviewAt: nextReviewDate,
    reviewStage: newStage,
    masteryLevel
  };
}

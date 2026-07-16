export const reviewProgressChangeEvent = 'review-progress-change';

export function announceReviewProgressChange() {
  window.dispatchEvent(new Event(reviewProgressChangeEvent));
}

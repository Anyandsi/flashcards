export enum ReviewRating {
  Bad = 'bad',
  Good = 'good',
  Perfect = 'perfect',
}

const dayInMilliseconds = 24 * 60 * 60 * 1000;

export const goodRatingLifetimeMilliseconds = 2 * dayInMilliseconds;
export const perfectRatingLifetimeMilliseconds = 5 * dayInMilliseconds;

type ReviewState = {
  lastReviewDate: string | null;
  reviewRating: ReviewRating | null;
};

export type TopicReviewProgress = {
  perfectCardCount: number;
  progress: number;
  topicId: string;
  totalCardCount: number;
};

export type SubjectReviewProgress = {
  progress: number;
  topicProgresses: TopicReviewProgress[];
};

export function getEffectiveReviewRating(
  reviewState: ReviewState,
  currentTime = Date.now(),
): ReviewRating | null {
  const { lastReviewDate, reviewRating } = reviewState;

  if (!reviewRating || !lastReviewDate) {
    return reviewRating;
  }

  const lastReviewTime = Date.parse(lastReviewDate);

  if (Number.isNaN(lastReviewTime)) {
    return reviewRating;
  }

  const timeSinceReview = currentTime - lastReviewTime;

  switch (reviewRating) {
    case ReviewRating.Perfect:
      return timeSinceReview >= perfectRatingLifetimeMilliseconds
        ? ReviewRating.Good
        : ReviewRating.Perfect;
    case ReviewRating.Good:
      return timeSinceReview >= goodRatingLifetimeMilliseconds
        ? ReviewRating.Bad
        : ReviewRating.Good;
    case ReviewRating.Bad:
      return ReviewRating.Bad;
  }
}

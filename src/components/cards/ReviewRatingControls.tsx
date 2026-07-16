import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { ReviewRating } from '../../models/review';

type ReviewRatingControlsProps = {
  disabled: boolean;
  onRate: (rating: ReviewRating) => void;
};

export function ReviewRatingControls({ disabled, onRate }: ReviewRatingControlsProps) {
  return (
    <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
      <button
        aria-keyshortcuts="1"
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-destructive/70 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-destructive"
        disabled={disabled}
        onClick={() => {
          onRate(ReviewRating.Bad);
        }}
        type="button"
      >
        <ThumbsDown aria-hidden="true" size={17} />
        Cooked
      </button>
      <button
        aria-keyshortcuts="2"
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-primary text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
        disabled={disabled}
        onClick={() => {
          onRate(ReviewRating.Good);
        }}
        type="button"
      >
        <ThumbsUp aria-hidden="true" size={17} />
        I knew this one!
      </button>
      <button
        aria-keyshortcuts="3"
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-success/70 text-sm font-semibold text-success transition hover:bg-success hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-success"
        disabled={disabled}
        onClick={() => {
          onRate(ReviewRating.Perfect);
        }}
        type="button"
      >
        <Sparkles aria-hidden="true" size={17} />
        Easy
      </button>
    </div>
  );
}

type ReviewProgressBarProps = {
  label: string;
  progress: number;
};

export function getReviewProgressPercentage(progress: number) {
  return Math.round(Math.min(Math.max(progress, 0), 1) * 100);
}

export function ReviewProgressBar({ label, progress }: ReviewProgressBarProps) {
  const percentage = getReviewProgressPercentage(progress);

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percentage}
      className="h-2 overflow-hidden rounded-full bg-secondary"
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-success transition-[width] duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

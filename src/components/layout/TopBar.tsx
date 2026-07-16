import { Pause, Play, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { reviewProgressChangeEvent } from '../../app/review/reviewEvents';
import type { SubjectReviewProgress } from '../../models/review';
import {
  getReviewProgressPercentage,
  ReviewProgressBar,
} from '../review/ReviewProgressBar';
import { SubjectSwitcher } from './SubjectSwitcher';

const minimumSessionSeconds = 10 * 60;
const currentSubjectChangeEvent = 'current-subject-change';
const progressRefreshIntervalMilliseconds = 5 * 60 * 1000;

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
  );
}

export function TopBar() {
  const location = useLocation();
  const progressRequestId = useRef(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [reviewProgress, setReviewProgress] = useState<SubjectReviewProgress | null>(null);
  const elapsedTime = formatElapsedTime(elapsedSeconds);
  const reviewProgressPercentage = getReviewProgressPercentage(reviewProgress?.progress ?? 0);

  const loadReviewProgress = useCallback(async () => {
    const requestId = ++progressRequestId.current;

    try {
      const currentSubjectId = await window.api.subjects.getCurrent();
      const storedProgress = currentSubjectId
        ? await window.api.review.getSubjectProgress(currentSubjectId)
        : null;

      if (requestId === progressRequestId.current) {
        setReviewProgress(storedProgress);
      }
    } catch {
      if (requestId === progressRequestId.current) {
        setReviewProgress(null);
      }
    }
  }, []);

  useEffect(() => {
    void loadReviewProgress();
  }, [loadReviewProgress, location.pathname]);

  useEffect(() => {
    const refreshProgress = () => {
      void loadReviewProgress();
    };

    window.addEventListener(currentSubjectChangeEvent, refreshProgress);
    window.addEventListener(reviewProgressChangeEvent, refreshProgress);
    window.addEventListener('focus', refreshProgress);
    const intervalId = window.setInterval(
      refreshProgress,
      progressRefreshIntervalMilliseconds,
    );

    return () => {
      progressRequestId.current += 1;
      window.removeEventListener(currentSubjectChangeEvent, refreshProgress);
      window.removeEventListener(reviewProgressChangeEvent, refreshProgress);
      window.removeEventListener('focus', refreshProgress);
      window.clearInterval(intervalId);
    };
  }, [loadReviewProgress]);

  useEffect(() => {
    if (!isActive) {
      setElapsedSeconds(0);
      return undefined;
    }

    if (isPaused) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isActive, isPaused]);

  async function handleToggleGrinding() {
    if (!isActive) {
      setActiveSubjectId(await window.api.subjects.getCurrent());
      setElapsedSeconds(0);
      setIsPaused(false);
      setIsActive(true);
      return;
    }

    const secondsToSave = elapsedSeconds;
    const subjectId = activeSubjectId;

    setIsActive(false);
    setIsPaused(false);
    setActiveSubjectId(null);

    if (subjectId && secondsToSave >= minimumSessionSeconds) {
      await window.api.subjects.recordSession(subjectId, secondsToSave);
    }
  }

  function handleTogglePause() {
    if (isActive) {
      setIsPaused((currentValue) => !currentValue);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isGrindingToggle =
        event.target instanceof HTMLElement &&
        !!event.target.closest('[data-grinding-toggle]');

      if (
        !isActive ||
        event.code !== 'Space' ||
        event.repeat ||
        (isInteractiveTarget(event.target) && !isGrindingToggle)
      ) {
        return;
      }

      event.preventDefault();
      handleTogglePause();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-4 border-b border-border bg-background px-6 py-3">
      <SubjectSwitcher />

      <div className="order-3 w-40 shrink-0 lg:order-none">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Subject progress</span>
          <span>{reviewProgress ? `${reviewProgressPercentage}%` : '—'}</span>
        </div>
        <ReviewProgressBar
          label="Current subject review progress"
          progress={reviewProgress?.progress ?? 0}
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer size={17} aria-hidden="true" />
          <time dateTime={`PT${elapsedSeconds}S`}>{elapsedTime}</time>
        </div>

        {isActive ? (
          <button
            aria-keyshortcuts="Space"
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
            onClick={handleTogglePause}
            type="button"
          >
            {isPaused ? (
              <Play aria-hidden="true" size={16} />
            ) : (
              <Pause aria-hidden="true" size={16} />
            )}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        ) : null}

        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          data-grinding-toggle
          onClick={(event) => {
            event.currentTarget.blur();
            void handleToggleGrinding();
          }}
          type="button"
        >
          {isActive ? 'Stop grinding' : 'Start grinding'}
        </button>
      </div>
    </header>
  );
}
